import powerbi from 'powerbi-visuals-api';
import IViewPort = powerbi.IViewport;

import { VisualSettings } from './settings';

import * as d3Scale from 'd3-scale';
import { randomLcg } from 'd3-random';

interface IAxis {
  range: [number, number];
  translate: ICoordinates;
}

interface IValueAxis extends IAxis {
  domain: [number, number];
  scale: d3.ScaleLinear<number, number>;
}
interface ICategoryAxis extends IAxis {
  domain: string[];
  scale: d3.ScaleBand<string>;
}

interface ICoordinates {
  x: number;
  y: number;
}

interface IMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Represents a data point within a visual category.
 */
interface IGroup {
  // Name of group
  name: string;
  // Data point value
  value: number;
}

/**
 * Represents a visual category data item.
 */
interface ICategory {
  // Name of category
  name: string;
  // Category group items
  groups: IGroup[];
}

/**
 * Visual view model.
 */
interface IViewModel {
  margin: IMargin;
  // Visual category data items
  categories: ICategory[];
  // Parsed visual settings
  settings: VisualSettings;

  categoryAxis: ICategoryAxis;

  valueAxis: IValueAxis;
}

/**
 * Create a view model of static data we can use to prototype our visual's look.
 *
 * @param settings  - parsed visual settings.
 */
export function mapViewModel(
  settings: VisualSettings,
  viewPort: IViewPort
): IViewModel {
  const margin = {
    top: 10,
    right: 10,
    bottom: 25,
    left: 75,
  };

  const valueAxisDomain: [number, number] = [6, 20];
  const valueAxisRange: [number, number] = [
    margin.left,
    viewPort.width - margin.right,
  ];
  const categoryAxisDomain = [
    'category A',
    'category B',
    'category C',
    'category D',
  ];

  const categoryAxisRange: [number, number] = [
    margin.top,
    viewPort.height - margin.bottom,
  ];
  return {
    margin: margin,
    categoryAxis: {
      range: categoryAxisRange,
      domain: categoryAxisDomain,
      scale: d3Scale
        .scaleBand()
        .domain(categoryAxisDomain)
        .range(categoryAxisRange),
      translate: { x: margin.left, y: 0 },
    },
    valueAxis: {
      range: valueAxisRange,
      domain: valueAxisDomain,
      scale: d3Scale
        .scaleLinear()
        .domain(valueAxisDomain)
        .range(valueAxisRange),
      translate: { x: 0, y: viewPort.height - margin.bottom },
    },
    categories: [
      {
        name: 'Category A',
        groups: [
          { name: 'Group One', value: 6 },
          { name: 'Group Two', value: 14 },
        ],
      },
      {
        name: 'Category B',
        groups: [
          { name: 'Group One', value: 6 },
          { name: 'Group Two', value: 14 },
        ],
      },
      {
        name: 'Category C',
        groups: [
          { name: 'Group One', value: 20 },
          { name: 'Group Two', value: 12 },
        ],
      },
      {
        name: 'Category D',
        groups: [
          { name: 'Group One', value: 18 },
          { name: 'Group Two', value: 7 },
        ],
      },
    ],
    settings: settings,
  };
}
