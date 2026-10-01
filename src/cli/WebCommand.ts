import { Command } from 'clipanion';
import { serveWeb } from './web-server';

export class WebCommand extends Command {
  public static override paths = [['web']];

  public static override usage = Command.Usage({
    description: 'Serve the built web application at http://127.0.0.1:4173.',
  });

  public async execute(): Promise<number> {
    return serveWeb(this.context.stdout);
  }
}
