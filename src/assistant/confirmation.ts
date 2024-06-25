
// confirmation.ts
import blessed from 'blessed';
import contrib from 'blessed-contrib';
import fs from 'fs';

// Function to display a confirmation prompt to the user
export async function confirmExecution(api: any, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const screen = blessed.screen({
      smartCSR: true
    });

    const questionBox = blessed.question({
      parent: screen,
      border: 'line',
      height: 'shrink',
      width: 'half',
      top: 'center',
      left: 'center',
      label: ' {blue-fg}Confirmation{/blue-fg} ',
      tags: true,
      keys: true,
      vi: true,
      content: message + '\n\n{green-fg}[Y]{/green-fg}es / {red-fg}[N]{/red-fg}o',
    });

    questionBox.on('submit', (answer: any) => {
      screen.destroy();
      resolve(answer.toLowerCase() === 'y');
    });

    questionBox.key(['escape', 'n'], () => {
      screen.destroy();
      resolve(false);
    });

    questionBox.focus();
    screen.render();
  });
}

// Function to display code for editing and get confirmation
export async function displayCodeForEdit(api: any, message: string, filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const screen = blessed.screen({
      smartCSR: true
    });

    const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

    const editor = grid.set(0, 0, 10, 12, contrib.markdown, {
      label: ` ${filePath} `,
      keys: true,
      vi: true,
      content: fs.readFileSync(filePath, 'utf8'),
    });

    const confirmBox = grid.set(10, 0, 2, 12, blessed.box, {
      content: message + '\n\n{green-fg}[S]{/green-fg}ave & Execute / {red-fg}[C]{/red-fg}ancel',
      tags: true,
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: '#f0f0f0'
        },
        hover: {
          bg: 'green'
        }
      }
    });

    confirmBox.key(['escape', 'c'], () => {
      screen.destroy();
      resolve(false);
    });

    confirmBox.key(['s'], () => {
      fs.writeFileSync(filePath, editor.getText());
      screen.destroy();
      resolve(true);
    });

    screen.render();
  });
}