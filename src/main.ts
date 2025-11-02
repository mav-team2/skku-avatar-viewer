import { Application } from './core/Application';

const app = new Application();
app.init();

// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.destroy();
  });
}
