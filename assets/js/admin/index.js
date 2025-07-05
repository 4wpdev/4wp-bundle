import { render } from '@wordpress/element';
import App from './App';

document.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('4wp-bundle-admin-app');
  if (target) render(<App />, target);
});
