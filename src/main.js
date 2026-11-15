import { mount } from 'svelte';
import App from './App.svelte';
import './styles.css';
import './design-system.css';
import './teacher-layout.css';
import './admin-layout.css';
import './demo-data.css';

const app = mount(App, { target: document.getElementById('app') });
export default app;
