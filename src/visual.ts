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
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import * as d3Select from 'd3-selection';
import * as d3Axis from 'd3-axis';

import { VisualSettings, ConnectingLinesSettings } from './settings';
import { isDataViewValid, mapViewModel, ICategory, IGroup } from './viewModel';

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
  // visual host methods
  private host: IVisualHost;

  constructor(options: VisualConstructorOptions) {
    console.log('Visual constructor', options);
    this.target = options.element;
    this.host = options.host;
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
    console.log('Visual update', options);

    try {
      const dataView = options && options.dataViews && options.dataViews[0];

      this.settings = Visual.parseSettings(dataView);
      const dataViewIsValid = isDataViewValid(dataView);

      // The options.viewport object gives us the current visual's size, so we can assign this to
      // our chart container to allow it to grow and shrink.
      this.chartContainer
        .attr('width', options.viewport.width)
        .attr('height', options.viewport.height);

      // If the data view is invalid, we'll just return early and not draw anything
      if (!dataViewIsValid) {
        this.plotContainer.selectAll('*').remove();
        this.categoryAxisContainer.selectAll('*').remove();
        this.valueAxisContainer.selectAll('*').remove();
      } else {
        // Map static data into our view model
        const viewModel = mapViewModel(
          dataView,
          this.settings,
          options.viewport,
          this.host
        );

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

        // Create an array of SVG group (g) elements and bind an `ICategory` to each; move it to the correct position on the axis
        const categories = this.plotContainer
          .selectAll('.category')
          .data(viewModel.categories)
          .join(
            (enter) => {
              // Create grouping element
              const group = enter
                .append('g')
                .classed('category', true)
                .call(
                  this.transformCategoryGroup,
                  viewModel.categoryAxis.scale
                );

              // Add line
              group
                .append('line')
                .classed('dumbbellLine', true)
                .call(
                  this.transformDumbbellLine,
                  viewModel.categoryAxis.scale,
                  viewModel.valueAxis.scale,
                  this.settings.connectingLines
                );

              // circles
              group
                .selectAll('.dumbbellPoint')
                .data((d) => d.groups)
                .join('circle')
                .classed('dumbbellPoint', true)
                .call(
                  this.transformDumbbellCircle,
                  viewModel.categoryAxis.scale,
                  viewModel.valueAxis.scale,
                  this.settings.dataPoints.radius
                );

              // Add labels
              group
                .filter((d, di) => di === 0)
                .selectAll('.dataLabel')
                .data((d) => d.groups)
                .join('text')
                .classed('dataLabel', true)
                .call(
                  this.transformDataLabel,
                  viewModel.valueAxis.scale,
                  this.settings.dataLabels.show
                );

              // Group element is used for any further operations
              return group;
            },
            (update) => {
              // Re-position groups
              update.call(
                this.transformCategoryGroup,
                viewModel.categoryAxis.scale
              );

              // Re-position line coordinates
              update
                .select('.dumbbellLine')
                .call(
                  this.transformDumbbellLine,
                  viewModel.categoryAxis.scale,
                  viewModel.valueAxis.scale,
                  this.settings.connectingLines
                );

              // Re-position circles
              update
                .selectAll('.dumbbellPoint')
                .call(
                  this.transformDumbbellCircle,
                  viewModel.categoryAxis.scale,
                  viewModel.valueAxis.scale,
                  this.settings.dataPoints.radius
                );

              // Re-position labels
              update
                .selectAll('.dataLabel')
                .call(
                  this.transformDataLabel,
                  viewModel.valueAxis.scale,
                  this.settings.dataLabels.show
                );

              // Group element is used for any further operations
              return update;
            },
            (exit) => {
              exit.remove();
            }
          );

        // Inspect the view model in the browser console
        console.log(viewModel);
      }
    } catch (e) {
      console.log(e);
      debugger;
    }
  }

  private transformCategoryGroup(
    selection: d3.Selection<SVGGElement, ICategory, any, any>,
    categoryScale: d3.ScaleBand<string>
  ) {
    selection.attr(
      'transform',
      (d) => `translate(0, ${categoryScale(d.name)})`
    );
  }

  private transformDumbbellLine(
    selection: d3.Selection<SVGLineElement, ICategory, any, any>,
    categoryScale: d3.ScaleBand<string>,
    valueScale: d3.ScaleLinear<number, number>,
    settings: ConnectingLinesSettings
  ) {
    const midpoint = categoryScale.bandwidth() / 2;
    selection
      .attr('x1', (d) => valueScale(d.min))
      .attr('x2', (d) => valueScale(d.max))
      .attr('y1', midpoint)
      .attr('y2', midpoint)
      .attr('stroke-width', settings.strokeWidth)
      .attr('stroke', settings.colour);
  }

  private transformDumbbellCircle(
    selection: d3.Selection<SVGCircleElement, IGroup, any, any>,
    categoryScale: d3.ScaleBand<string>,
    valueScale: d3.ScaleLinear<number, number>,
    radius: number
  ) {
    const midpoint = categoryScale.bandwidth() / 2;
    selection
      .attr('cx', (d) => valueScale(d.value))
      .attr('cy', midpoint)
      .attr('r', radius)
      .attr('fill', (d) => d.colour);
  }

  private transformDataLabel(
    selection: d3.Selection<SVGTextElement, IGroup, any, any>,
    valueScale: d3.ScaleLinear<number, number>,
    show: boolean
  ) {
    selection
      .attr('x', (d) => valueScale(d.value))
      .attr('y', 0)
      .attr('fill', (d) => d.colour)
      .text((d) => d.name)
      .style('visibility', show ? 'visible' : 'hidden');
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
