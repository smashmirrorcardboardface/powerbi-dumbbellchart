import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import DataView = powerbi.DataView;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import { VisualSettings } from './settings';

import * as d3Scale from 'd3-scale';

/**
 * Shared axis properties.
 */
interface IAxis {
  // Physical range of the axis (start and end)
  range: [number, number];
  // X/Y coordinates for SVG translation of enclosing group
  translate: ICoordinates;
}

/**
 * Properties specific to the value axis.
 */
interface IValueAxis extends IAxis {
  // Axis domain values
  domain: [number, number];
  // Scale to generate axis from domain and range
  scale: d3Scale.ScaleLinear<number, number>;
  // Tick count (number of ticks to apply)
  tickCount: number;
  // Tick size (length of each gridline)
  tickSize: number;
}

/**
 * Properties specific to the category axis.
 */
interface ICategoryAxis extends IAxis {
  // Category domain values
  domain: string[];
  // Scale to generate axis from domain and range
  scale: d3Scale.ScaleBand<string>;
}

/**
 * Generic interface we can use to store x/y coordinates.
 */
interface ICoordinates {
  x: number;
  y: number;
}

/**
 * Used to specify the visual margin values.
 */
interface IMargin {
  // Pixels to leave at the top
  top: number;
  // Pixels to leave to the right
  right: number;
  // Pixels to leave at the bottom
  bottom: number;
  // Pixels to leave to the left
  left: number;
}

/**
 * Represents a data point within a visual category.
 */
export interface IGroup {
  // Name of group
  name: string;
  // Data point value
  value: number;
  colour: string;
}

/**
 * Represents a visual category data item.
 */
export interface ICategory {
  // Name of category
  name: string;
  // Category group items
  groups: IGroup[];
  min: number;
  max: number;
}

/**
 * Visual view model.
 */
interface IViewModel {
  // Visual margin values
  margin: IMargin;
  // Visual category data items
  categories: ICategory[];
  // Parsed visual settings
  settings: VisualSettings;
  // Category axis information
  categoryAxis: ICategoryAxis;
  // Value axis information
  valueAxis: IValueAxis;
  //min and max values for the visual
  minValue: number;
  maxValue: number;
}

export function isDataViewValid(dataView: DataView): boolean {
  if (
    dataView &&
    dataView.categorical &&
    dataView.categorical.categories &&
    dataView.categorical.categories.length === 1 &&
    dataView.categorical.values &&
    dataView.categorical.values.length > 0
  ) {
    return true;
  }

  return false;
}

function getNewViewModel(settings?: VisualSettings): IViewModel {
  return {
    margin: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    },
    categories: [],
    settings: settings,
    categoryAxis: null,
    valueAxis: null,
    minValue: 0,
    maxValue: 0,
  };
}

export function mapViewModel(
  dataView: DataView,
  settings: VisualSettings,
  viewport: IViewport,
  host: IVisualHost
): IViewModel {
  //declare empty view model
  const viewModel: IViewModel = getNewViewModel(settings);

  if (!isDataViewValid(dataView)) return viewModel;

  // Assign our margin values so we can re-use them more easily
  viewModel.margin.bottom = 25;
  viewModel.margin.left = 75;

  const margin = viewModel.margin;

  let datasetMinValue: number;
  let datasetMaxValue: number;

  const categoryColumn = dataView.categorical.categories[0];

  const valueGroupings = dataView.categorical.values;

  categoryColumn.values.forEach((cv, ci) => {
    const categoryName = <string>cv;

    let categoryMinValue: number;
    let categoryMaxValue: number;

    const groups: IGroup[] = valueGroupings.map((g, gi) => {
      const groupName = <string>g.source.groupName;
      const groupValue = <number>g.values[ci];

      categoryMinValue = Math.min(categoryMinValue || groupValue, groupValue);
      categoryMaxValue = Math.max(categoryMaxValue || groupValue, groupValue);

      // resolve colour for theme
      const colour = host.colorPalette.getColor(groupName).value;

      return {
        name: groupName,
        value: groupValue,
        colour: colour,
      };
    });

    viewModel.minValue = datasetMinValue;
    viewModel.maxValue = datasetMaxValue;

    //resolve dataset min/max
    datasetMinValue = Math.min(
      datasetMinValue || categoryMinValue,
      categoryMinValue
    );
    datasetMaxValue = Math.max(
      datasetMaxValue || categoryMaxValue,
      categoryMaxValue
    );

    //push category object into the view model
    viewModel.categories.push({
      name: categoryName,
      groups: groups,
      min: categoryMinValue,
      max: categoryMaxValue,
    });
  });

  // Value axis domain (min/max)
  const valueAxisDomain: [number, number] = [datasetMinValue, datasetMaxValue];

  // Category axis domain (unique values)
  const categoryAxisDomain = viewModel.categories.map((c) => c.name);
  // Derived range for the value axis, based on margin values
  const valueAxisRange: [number, number] = [
    margin.left,
    viewport.width - margin.right,
  ];

  // Derived range for the category axis, based on margin values
  const categoryAxisRange: [number, number] = [
    margin.top,
    viewport.height - margin.bottom,
  ];

  const valueAxisTickCount = 3;

  // Create the category axis scale
  viewModel.categoryAxis = {
    range: categoryAxisRange,
    domain: categoryAxisDomain,
    scale: d3Scale
      .scaleBand()
      .domain(categoryAxisDomain)
      .range(categoryAxisRange)
      .padding(0.2),
    translate: {
      x: margin.left,
      y: 0,
    },
  };

  // Create the value axis scale
  viewModel.valueAxis = {
    range: valueAxisRange,
    domain: valueAxisDomain,
    scale: d3Scale
      .scaleLinear()
      .domain(valueAxisDomain)
      .range(valueAxisRange)
      .nice(valueAxisTickCount),
    translate: {
      x: 0,
      y: viewport.height - margin.bottom,
    },
    tickCount: valueAxisTickCount,
    tickSize: -viewport.height - margin.top - margin.bottom,
  };

  // View model
  return viewModel;
}
