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

import VisualUpdateType = powerbi.VisualUpdateType;
import { VisualSettings } from './settings';
import { ViewModelManager } from './viewModel';
import { DomManager } from './dom';

export class Visual implements IVisual {
  // Visual's main (root) element
  private target: HTMLElement;
  // Parsed visual settings
  private settings: VisualSettings;
  // Developer visual host services
  private host: IVisualHost;

  private viewModelManager: ViewModelManager;

  // Main DOM manager
  private domManager: DomManager;

  constructor(options: VisualConstructorOptions) {
    console.log('Visual constructor', options);
    this.target = options.element;
    this.host = options.host;
    this.viewModelManager = new ViewModelManager(this.host);

    this.domManager = new DomManager(this.target);
  }

  public update(options: VisualUpdateOptions) {
    console.log('Visual update', options);

    try {
      // Declare data view for re-use
      const dataView = options && options.dataViews && options.dataViews[0];

      // Parse data view into settings
      this.settings = Visual.parseSettings(dataView);

      // Update view model if data view has changed
      switch (options.type) {
        case VisualUpdateType.All:
        case VisualUpdateType.Data:
          console.log('Visual update data');
          this.viewModelManager.mapDataView(dataView, this.settings);
          break;
      }

      //access dataViewModel
      const viewModel = this.viewModelManager.viewModel;
      //access chart manager
      const chartManager = this.domManager.chartManager;
      // The options.viewport object gives us the current visual's size, so we can assign this to
      // our chart container to allow it to grow and shrink.
      chartManager.updateViewport(options.viewport);

      // Ensure our visual responds appropriately for the user if the data view isn't valid
      if (!viewModel.isValid) {
        console.log('Visual update data invalid');
        chartManager.clear();
      } else {
        //update view model axis from viewport info
        this.viewModelManager.updateAxes(options.viewport);
        //redraw chart
        chartManager.plot(viewModel);
      }
    } catch (e) {
      console.log('Error!', e);
      debugger;
    } finally {
      console.log(this.viewModelManager.viewModel);
    }
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
    let objects = <VisualObjectInstanceEnumerationObject>(
      VisualSettings.enumerateObjectInstances(
        this.settings || VisualSettings.getDefault(),
        options
      )
    );

    console.log(`object: ${options.objectName}`);

    switch (options.objectName) {
      case 'dataPoints': {
        this.viewModelManager.viewModel.categories[0].groups.forEach(
          (group, index) => {
            objects.instances.push({
              objectName: options.objectName,
              displayName: group.name,
              properties: {
                fillColor: {
                  solid: {
                    color: group.color,
                  },
                },
              },
              selector: group.groupSelectionId.getSelector(),
            });
          }
        );
      }
    }

    console.log(objects.instances);

    return objects;
  }
}
