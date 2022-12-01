// eslint-disable-next-line no-unused-vars
import { selectAll } from 'd3-selection';

import { getHighlightClassName } from '../function';

export default class Populator {
  constructor(calendar) {
    this.calendar = calendar;
  }

  /**
   * Colorize the cell via a style attribute if enabled
   */
  #addStyle(element) {
    const { options } = this.calendar.options;

    if (!this.calendar.colorizer.scale) {
      return;
    }

    element.attr('fill', (d) => {
      if (
        d.v === null &&
        options.hasOwnProperty('considerMissingDataAsZero') &&
        !options.considerMissingDataAsZero
      ) {
        if (options.legendColors.hasOwnProperty('base')) {
          return options.legendColors.base;
        }
      }

      if (
        options.legendColors?.hasOwnProperty('empty') &&
        (d.v === 0 ||
          (d.v === null &&
            options.hasOwnProperty('considerMissingDataAsZero') &&
            options.considerMissingDataAsZero))
      ) {
        return options.legendColors.empty;
      }

      if (
        d.v < 0 &&
        options.legend[0] > 0 &&
        options.legendColors?.hasOwnProperty('overflow')
      ) {
        return options.legendColors.overflow;
      }

      return this.calendar.colorizer.scale(
        Math.min(d.v, options.legend[options.legend.length - 1]),
      );
    });
  }

  #getClassName(d) {
    const { calendar } = this;
    const { options } = calendar.options;

    const htmlClass = getHighlightClassName(calendar, d.t, options)
      .trim()
      .split(' ');
    const pastDate = calendar.helpers.DateHelper.dateFromPreviousInterval(
      options.subDomain,
      d.t,
      new Date(),
    );

    if (
      calendar.colorizer.scale === null ||
      (d.v === null &&
        options.hasOwnProperty('considerMissingDataAsZero') &&
        !options.considerMissingDataAsZero &&
        !options.legendColors.hasOwnProperty('base'))
    ) {
      htmlClass.push('graph-rect');
    }

    if (d.v !== null) {
      htmlClass.push(calendar.colorizer.getClassName(d.v));
    } else if (options.considerMissingDataAsZero && pastDate) {
      htmlClass.push(calendar.colorizer.getClassName(0));
    }

    if (options.onClick !== null) {
      htmlClass.push('hover_cursor');
    }

    return htmlClass.join(' ').trim();
  }

  populate() {
    const { calendar } = this;
    const { options } = calendar.options;
    const svg = calendar.calendarPainter.root.selectAll('.graph-domain');

    const rect = svg
      .selectAll('svg')
      .selectAll('g')
      .data((d) => calendar.domainCollection.get(d) || []);

    rect
      .transition()
      .duration(options.animationDuration)
      .select('rect')
      .attr('class', (d) => this.#getClassName(d))
      .call((d) => this.#addStyle(d))
      .attr('title', (d) => {
        const { subDomainTitleFn } = options.formatter;

        return subDomainTitleFn ? subDomainTitleFn(new Date(d.t), d.v) : null;
      });

    /**
     * Change the subDomainLabel class if necessary
     * Also change the text, e.g when text is representing the value
     * instead of the date
     */
    rect
      .transition()
      .duration(options.animationDuration)
      .select('text')
      .attr(
        'class',
        (d) => `subdomain-text${getHighlightClassName(calendar, d.t, options)}`,
      )
      .call((element) => {
        element.text((d, i, nodes) => calendar.helpers.DateHelper.format(
          d.t,
          options.formatter.subDomainLabel,
          d.v,
          nodes[i],
        ));
      });
  }
}
