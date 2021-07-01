/* eslint-env browser */
import Nanocomponent from 'nanocomponent';
// const Nanocomponent = require('nanocomponent');

const defaultColor = 'hotpink';
const defaultWidth = 400;
const defaultHeight = 240;

export class FrequencyBars extends Nanocomponent {
  createElement(props) {
    this.audioContext = new AudioContext();

    this.canvas = document.createElement('canvas');
    this.canvas.width = props.width || 400;
    this.canvas.height = props.height || 240;
    this.context = this.canvas.getContext('2d');

    this.update(props);

    return this.canvas;
  }

  update({ audio, color, background, width, height }) {
    console.log('FrequencyBars update..');
    this.color = color || defaultColor;
    this.background = background;

    if (width == null) width = defaultWidth;
    if (height == null) height = defaultHeight;
    if (width !== this.canvas.width) {
      this.canvas.width = width;
    }
    if (height !== this.canvas.height) {
      this.canvas.height = height;
    }

    if (audio !== this.audio) {
      // if (this.audio) this.stop();
      this.audio = audio;
      this.start();
    }

    return false;
  }

  start() {
    console.log('FrequencyBars start..');
    const { audioContext, canvas } = this;
    const { width } = canvas;

    const analyser = audioContext.createAnalyser();
    let fftSize = 32;
    while (fftSize * 2 < width) fftSize *= 2;
    analyser.fftSize = fftSize;
    const source = audioContext.createMediaElementSource(this.audio);
    source.connect(analyser);
    source.connect(audioContext.destination);
    this.source = source;
    this.analyser = analyser;
    this.buffer = new Uint8Array(analyser.frequencyBinCount);
    console.log('FrequencyBars start..');
    this.draw();
  }

  draw() {
    const { analyser, canvas, context, buffer } = this;

    analyser.getByteFrequencyData(buffer); // buffer can be reused
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (this.background) {
      context.fillStyle = this.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.fillStyle = this.color;
    const width = Math.floor(canvas.width / (buffer.length + 1));
    for (let i = 0; i < buffer.length; i += 1) {
      const height = (canvas.height / 255) * buffer[i];
      context.fillRect(
        (width + 1) * i,
        canvas.height - height - 2,
        width,
        height + 2
      );
    }

    this.loop = requestAnimationFrame(() => this.draw());
  }

  stop() {
    if (this.loop) {
      cancelAnimationFrame(this.loop);
      this.loop = null;
    }
    // if (this.source) {
    //   console.log('disconnect source!');
    //   this.source.disconnect(this.analyser);
    //   this.source.disconnect(this.audioContext.destination);
    // }
    this.source = null;
    this.analyser = null;
    this.buffer = null;
  }

  // unload() {
  //   // this.stop();
  // }
}
