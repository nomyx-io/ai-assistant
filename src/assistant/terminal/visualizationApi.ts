import { UI } from "./ui";

export class VisualizationAPI {
    constructor(private ui: UI) {}
  
    createLineChart(title: string, data: {x: number[], y: number[], title: string}) {
      this.ui.createChart('line', title, data);
    }
  
    createBarChart(title: string, data: {titles: string[], data: number[]}) {
      this.ui.createChart('bar', title, data);
    }
  
    createPieChart(title: string, data: {percent: number, label: string}[]) {
      this.ui.createChart('pie', title, data);
    }

}
  