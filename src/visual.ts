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
import { mapViewModel } from './viewModel';
import { map } from 'd3-collection';

export class Visual implements IVisual {
  private target: HTMLElement;
  private chartContainer: d3.Selection<SVGElement, any, any, any>;
  private categoryAxisContainer: d3.Selection<SVGElement, any, any, any>;
  private valueAxisContainer: d3.Selection<SVGElement, any, any, any>;
  private plotContainer: d3.Selection<SVGElement, any, any, any>;
  private settings: VisualSettings;

  constructor(options: VisualConstructorOptions) {
    console.log('Visual constructor', options);
    this.target = options.element;

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

    this.chartContainer
      .attr('width', options.viewport.width)
      .attr('height', options.viewport.height);

    const viewModel = mapViewModel(this.settings, options.viewport);

    this.categoryAxisContainer
      .attr(
        'transform',
        `translate(${viewModel.categoryAxis.translate.x}, ${viewModel.categoryAxis.translate.y})`
      )
      .call(d3Axis.axisLeft(viewModel.categoryAxis.scale));

    this.valueAxisContainer.selectAll('*').remove();

    this.valueAxisContainer
      .attr(
        'transform',
        `translate(${viewModel.valueAxis.translate.x}, ${viewModel.valueAxis.translate.y})`
      )
      .call(d3Axis.axisBottom(viewModel.valueAxis.scale));

    console.log(viewModel);
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
