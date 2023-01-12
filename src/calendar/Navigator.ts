import { ScrollDirection } from '../constant';

import type CalHeatmap from '../CalHeatmap';
import type DomainCollection from './DomainCollection';

export default class Navigator {
  calendar: CalHeatmap;

  minDomainReached: boolean;

  maxDomainReached: boolean;

  constructor(calendar: CalHeatmap) {
    this.calendar = calendar;
    this.maxDomainReached = false;
    this.minDomainReached = false;
  }

  loadNewDomains(
    newDomainCollection: DomainCollection,
    direction: ScrollDirection = ScrollDirection.SCROLL_FORWARD,
  ): ScrollDirection {
    const { options } = this.calendar.options;
    const templatesClt = this.calendar.templateCollection;
    const minDate = options.date.min ?
      templatesClt.get(options.domain.type)!.extractUnit(+options.date.min) :
      undefined;
    const maxDate = options.date.max ?
      templatesClt.get(options.domain.type)!.extractUnit(+options.date.max) :
      undefined;
    const { domainCollection } = this.calendar;

    if (
      this.#isDomainBoundaryReached(
        newDomainCollection,
        minDate,
        maxDate,
        direction,
      )
    ) {
      return ScrollDirection.SCROLL_NONE;
    }

    newDomainCollection
      .clamp(minDate, maxDate)
      .slice(options.range, direction === ScrollDirection.SCROLL_FORWARD);

    domainCollection.merge(
      newDomainCollection,
      options.range,
      (domainKey: number, index: number) => {
        let subDomainEndDate = null;
        if (newDomainCollection.at(index + 1)) {
          subDomainEndDate = newDomainCollection.at(index + 1);
        } else {
          subDomainEndDate = this.calendar.dateHelper
            .intervals(options.domain.type, domainKey, 2)
            .pop();
        }
        return templatesClt
          .get(options.subDomain.type)!
          .mapping(domainKey, subDomainEndDate! - 1000)
          .map((d) => ({ ...d, v: null }));
      },
    );

    this.#setDomainsBoundaryReached(
      domainCollection.min,
      domainCollection.max,
      minDate,
      maxDate,
    );

    if (direction === ScrollDirection.SCROLL_BACKWARD) {
      this.calendar.eventEmitter.emit('domainsLoaded', [domainCollection.min]);
    } else if (direction === ScrollDirection.SCROLL_FORWARD) {
      this.calendar.eventEmitter.emit('domainsLoaded', [domainCollection.max]);
    }

    return direction;
  }

  jumpTo(date: Date, reset: boolean): ScrollDirection {
    const { domainCollection, options } = this.calendar;
    const minDate = new Date(domainCollection.min!);
    const maxDate = new Date(domainCollection.max!);

    if (date < minDate) {
      return this.loadNewDomains(
        this.calendar.createDomainCollection(date, minDate),
        ScrollDirection.SCROLL_BACKWARD,
      );
    }
    if (reset) {
      return this.loadNewDomains(
        this.calendar.createDomainCollection(date, options.options.range),
        minDate < date ?
          ScrollDirection.SCROLL_FORWARD :
          ScrollDirection.SCROLL_BACKWARD,
      );
    }

    if (date > maxDate) {
      return this.loadNewDomains(
        this.calendar.createDomainCollection(maxDate, date),
        ScrollDirection.SCROLL_FORWARD,
      );
    }

    return ScrollDirection.SCROLL_NONE;
  }

  #isDomainBoundaryReached(
    newDomainCollection: DomainCollection,
    minDate?: number,
    maxDate?: number,
    direction?: ScrollDirection,
  ): boolean {
    if (
      maxDate &&
      newDomainCollection.max! >= maxDate &&
      this.maxDomainReached &&
      direction === ScrollDirection.SCROLL_FORWARD
    ) {
      return true;
    }

    if (
      minDate &&
      newDomainCollection.min! <= minDate &&
      this.minDomainReached &&
      direction === ScrollDirection.SCROLL_BACKWARD
    ) {
      return true;
    }

    return false;
  }

  #setDomainsBoundaryReached(
    lowerBound: number,
    upperBound: number,
    min?: number,
    max?: number,
  ): void {
    if (min) {
      const reached = lowerBound <= min;
      this.calendar.eventEmitter.emit(
        reached ? 'minDateReached' : 'minDateNotReached',
      );
      this.minDomainReached = reached;
    }
    if (max) {
      const reached = upperBound >= max;
      this.calendar.eventEmitter.emit(
        reached ? 'maxDateReached' : 'maxDateNotReached',
      );
      this.maxDomainReached = reached;
    }
  }
}
