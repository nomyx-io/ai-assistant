
class ChartingTool {
  async execute(params, api) {
    const { chartType, data, options = {} } = params;

    if (!chartType || !data) {
      throw new Error('Chart type and data are required');
    }

    let chart;
    switch (chartType.toLowerCase()) {
      case 'bar':
        chart = ervy.bar(this.prepareBarData(data), options);
        break;
      case 'pie':
      case 'donut':
        chart = chartType.toLowerCase() === 'pie' ? ervy.pie(data, options) : ervy.donut(data, options);
        break;
      case 'gauge':
        chart = ervy.gauge(data, options);
        break;
      case 'scatter':
        chart = ervy.scatter(this.prepareScatterData(data), options);
        break;
      case 'heatmap':
        chart = ervy.heatmap(this.prepareHeatmapData(data), options);
        break;
      case 'bullet':
        chart = ervy.bullet(data, options);
        break;
      default:
        throw new Error('Unsupported chart type');
    }

    // Use the UI to display the chart
    api.emit('text', chart);

    return 'Chart displayed successfully';
  }

  prepareBarData(data) {
    return data.map(item => ({
      ...item,
      style: this.parseStyle(item.style)
    }));
  }

  prepareScatterData(data) {
    return data.map(item => ({
      ...item,
      style: this.parseStyle(item.style)
    }));
  }

  prepareHeatmapData(data) {
    return data.map(item => ({
      ...item,
      style: typeof item.style === 'string' ? ervy.bg(item.style, 2) : item.style
    }));
  }

  parseStyle(style) {
    if (typeof style === 'string') {
      const [color, char] = style.split(':');
      return char ? ervy.fg(color, char) : ervy.bg(color, 2);
    }
    return style;
  }
}



module.exports = {
  name: 'chart',
  description: 'Generate and display various types of charts in the terminal',
  schema: {
    name: 'chart',
    description: 'Generate and display various types of charts in the terminal',
    methodSignature: "chart(params: { chartType: string, data: any[], options?: object }): string",
    input_schema: {
      type: 'object',
      properties: {
        chartType: {
          type: 'string',
          enum: ['bar', 'pie', 'donut', 'gauge', 'scatter', 'heatmap', 'bullet'],
          description: 'The type of chart to generate'
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: { type: ['number', 'array'] },
              style: { type: 'string', description: 'Color for bg/fg, or "color:char" for custom character' }
            },
            required: ['key', 'value']
          },
          description: 'The data to be displayed in the chart',
        },
        options: {
          type: 'object',
          description: 'Additional options for customizing the chart',
          properties: {
            width: { type: 'number', description: 'Width of the chart' },
            height: { type: 'number', description: 'Height of the chart' },
            left: { type: 'number', description: 'Left padding' },
            legendGap: { type: 'number', description: 'Gap between legend items' },
            radius: { type: 'number', description: 'Radius for circular charts' },
            // Add more specific options as needed
          }
        }
      },
      required: ['chartType', 'data']
    },
    output_schema: {
      type: 'string',
      description: 'A message indicating the chart was displayed successfully'
    }
  },
  execute: async ({ chartType, data, options }, api) => {
    const tool = new ChartingTool();
    const result = await tool.execute({ chartType, data, options }, api);
    log(result);
    return result;
  }
}