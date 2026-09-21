/**
 * Catches a crash inside the 3D map (task S12).
 *
 * 3D drawing fails in ways ordinary code does not: a phone can run out of
 * graphics memory, or lose the drawing context when the app is backgrounded.
 * React only lets a class component catch that, so this is the one class
 * component in the app.
 *
 * When it happens the visitor gets the flat map instead of a blank Map tab,
 * and never sees an error.
 */
import { Component } from 'react';

export default class MapErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Kept for the debug menu and for anyone watching the console on a test phone.
    console.warn('[JalanKL] 3D map failed, showing the flat map instead:', error);
    this.props.onFail?.(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
