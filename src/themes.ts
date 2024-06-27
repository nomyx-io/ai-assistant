export interface Theme {
    name: string;
    background: string;
    foreground: string;
    border: string;
    focus: {
      border: string;
    };
    scrollbar: {
      bg: string;
    };
  }
  
  
  export const themes: { [key: string]: Theme } = {
    default: {
      name: 'Default',
      background: 'black',
      foreground: 'white',
      border: 'gray',
      focus: {
        border: 'cyan',
      },
      scrollbar: {
        bg: 'gray',
      },
    },
    light: {
      name: 'Light',
      background: 'white',
      foreground: 'black',
      border: 'gray',
      focus: {
        border: 'blue',
      },
      scrollbar: {
        bg: 'lightgray',
      },
    },
    dark: {
      name: 'Dark',
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      border: '#3c3c3c',
      focus: {
        border: '#0078d4',
      },
      scrollbar: {
        bg: '#3c3c3c',
      },
    },
    highContrast: {
      name: 'High Contrast',
      background: 'black',
      foreground: 'yellow',
      border: 'white',
      focus: {
        border: 'cyan',
      },
      scrollbar: {
        bg: 'white',
      },
    },
  };