'use strict';

import 'core-js/stable';
import './../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import * as d3Select from 'd3-selection';
import * as d3Axis from 'd3-axis';

import { VisualSettings } from './settings';
import { mapViewModel, ICategory } from './viewModel';

export class Visual implements IVisual {
  // Visual's main (root) element
  private target: HTMLElement;
  // SVG element for the entire chart; will be a child of the main visual element
  private chartContainer: d3.Selection<SVGElement, any, any, any>;
  // SVG group element to consolidate the category axis elements
  private categoryAxisContainer: d3.Selection<SVGElement, any, any, any>;
  // SVG group element to consolidate the value axis elements
  private valueAxisContainer: d3.Selection<SVGElement, any, any, any>;
  // SVG group element to consolidate the visual data elements
  private plotContainer: d3.Selection<SVGElement, any, any, any>;
  // Parsed visual settings
  private settings: VisualSettings;

  constructor(options: VisualConstructorOptions) {
    console.log('Visual constructor', options);
    this.target = options.element;
    // Create our fixed elements, as these only need to be done once
    this.chartContainer = d3Select
      .select(this.target)
      .append('svg')
      .attr('id', 'dumbbellChartContainer');
    this.categoryAxisContainer = this.chartContainer
      .append('g')
      .classed('categoryAxis', true)
      .classed('axis', true);
    this.valueAxisContainer = this.chartContainer
      .append('g')
      .classed('valueAxis', true)
      .classed('axis', true);
    this.plotContainer = this.chartContainer
      .append('g')
      .classed('plotArea', true);
  }

  public update(options: VisualUpdateOptions) {
    this.settings = Visual.parseSettings(
      options && options.dataViews && options.dataViews[0]
    );
    console.log('Visual update', options);

    // The options.viewport object gives us the current visual's size, so we can assign this to
    // our chart container to allow it to grow and shrink.
    this.chartContainer
      .attr('width', options.viewport.width)
      .attr('height', options.viewport.height);

    // Map static data into our view model
    const viewModel = mapViewModel(this.settings, options.viewport);

    // Call our axis functions in the appropriate containers
    this.categoryAxisContainer
      .attr(
        'transform',
        `translate(${viewModel.categoryAxis.translate.x}, ${viewModel.categoryAxis.translate.y})`
      )
      .call(d3Axis.axisLeft(viewModel.categoryAxis.scale) as any);

    this.valueAxisContainer
      .attr(
        'transform',
        `translate(${viewModel.valueAxis.translate.x}, ${viewModel.valueAxis.translate.y})`
      )
      .call(
        d3Axis
          .axisBottom(viewModel.valueAxis.scale)
          .ticks(viewModel.valueAxis.tickCount)
          .tickSize(viewModel.valueAxis.tickSize) as any
      );

    const categories = this.plotContainer
      .selectAll('.category')
      .data(viewModel.categories)
      .join(
        (enter) => {
          const group = enter
            .append('g')
            .classed('category', true)
            .call(this.transformCategoryGroup, viewModel.categoryAxis.scale);

          const midpoint = viewModel.categoryAxis.scale.bandwidth() / 2;

          group
            .append('line')
            .classed('dumbbellLine', true)
            .call(
              this.transformDumbellLine,
              viewModel.categoryAxis.scale,
              viewModel.valueAxis.scale
            );

          return group;
        },
        (update) => {
          update.call(
            this.transformCategoryGroup,
            viewModel.categoryAxis.scale
          );
          update
            .select('.dumbellLine')
            .call(
              this.transformDumbellLine,
              viewModel.categoryAxis.scale,
              viewModel.valueAxis.scale
            );
          return update;
        },
        (exit) => {
          exit.remove();
        }
      );

    console // Inspect the view model in the browser console
      .log('viewmodel: - ', viewModel);
  }

  private transformCategoryGroup(
    selection: d3.Selection<SVGElement, ICategory, any, any>,
    scale: d3.ScaleBand<string>
  ) {
    selection.attr('transform', (d) => `translate(0, ${scale(d.name)})`);
  }

  private transformDumbellLine(
    selection: d3.Selection<SVGElement, ICategory, any, any>,
    categoryScale: d3.ScaleBand<string>,
    valueScale: d3.ScaleLinear<number, number>
  ) {
    const midpoint = categoryScale.bandwidth() / 2;
    selection
      .attr('x1', (d) => valueScale(d.min))
      .attr('x2', (d) => valueScale(d.max))
      .attr('y1', midpoint)
      .attr('y2', midpoint);
  }

  private static parseSettings(dataView: DataView): VisualSettings {
    return <VisualSettings>VisualSettings.parse(dataView);
  }

  /**
   * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
   * objects and properties you want to expose to the users in the property pane.
   *
   */
  public enumerateObjectInstances(
    options: EnumerateVisualObjectInstancesOptions
  ): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
    return VisualSettings.enumerateObjectInstances(
      this.settings || VisualSettings.getDefault(),
      options
    );
  }
}
