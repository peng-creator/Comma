import { promises as fs } from 'fs';
import jschardet from 'jschardet';
import { assContentToCutProject } from '../util/index.mjs';
import playSVG from '../../assets/play.svg';

export class SubtitleStrategy {
  constructor({
    font = '1em serif',
    color = 'black',
    emphasisFont = 'bold 1.2em "Fira Sans", serif',
    emphasisColor = 'rgb(128, 31, 115)',
    show = true,
    background = 'yellow',
  } = {}) {
    this.font = font;
    this.color = color;
    this.emphasisColor = emphasisColor;
    this.emphasisFont = emphasisFont;
    this.show = show;
    this.background = background;
  }
}

class Ass {
  constructor(source) {
    this.source = source;
  }

  parse() {
    return assContentToCutProject(this.source).sort(
      (a, b) => a.start - b.start
    );
  }
}

class MyPlayer {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.subtitleStrategies = [];
    this.defaultSubtitleStrategy = new SubtitleStrategy();
    this.ass = [];
    this.isDirty = false;
    this.domReady = false;
    this.playSpeed = 1;
    this.playButton = null;
    window.addEventListener('resize', () => {
      this.resizeSubtitle();
    });
  }

  resizeSubtitle() {
    if (
      this.subtitleContainer === null ||
      this.subtitleContainer === undefined
    ) {
      return;
    }
    const subtitleContainerWidth = this.subtitleContainer.clientWidth;
    const subtitleContainerFontSize = subtitleContainerWidth * 0.03;
    this.subtitleContainer.style.fontSize = `${subtitleContainerFontSize}px`;
  }

  attach() {
    this.container = document.getElementById(this.containerId);
    if (this.container === null) {
      return;
    }
    this.domReady = true;
    let canvasInContainer = this.container.querySelector('canvas');
    if (canvasInContainer === null) {
      canvasInContainer = document.createElement('canvas');
      this.container.appendChild(canvasInContainer);
    }
    this.canvas = canvasInContainer;

    const subtitleContainerClassName = 'subtitle-container';
    let subtitleContainer = this.container.querySelector(
      `.${subtitleContainerClassName}`
    );
    if (subtitleContainer === null || subtitleContainer === undefined) {
      subtitleContainer = document.createElement('div');
      subtitleContainer.className = subtitleContainerClassName;
      subtitleContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('click');
      });
      subtitleContainer.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        console.log('mouseup');
      });
      this.container.appendChild(subtitleContainer);
    }
    this.subtitleContainer = subtitleContainer;

    const playButtonClassName = 'play-button';
    let playButton = this.container.querySelector(`.${playButtonClassName}`);
    if (playButton === null) {
      playButton = document.createElement('img');
      playButton.src = playSVG;
      playButton.className = playButtonClassName;
      playButton.style.display = 'none';
      this.container.appendChild(playButton);
    }
    this.playButton = playButton;
  }

  clear() {
    if (this.player && !this.player.isDisposed()) {
      this.player.dispose();
    }
    this.ass = [];
    this.isDirty = false;
    this.domReady = false;
    this.playSpeed = 1;
    if (this.container !== null) {
      this.container.innerHTML = '';
    }
  }

  togglePause() {
    if (this.player === null) {
      return;
    }
    if (this.player.paused()) {
      this.unpause();
    } else {
      this.pause();
    }
  }

  unpause() {
    if (this.player === null) {
      return;
    }
    this.player.play();
    if (this.playButton !== null) {
      this.playButton.style.display = 'none';
    }
  }

  pause() {
    if (this.player === null) {
      return;
    }
    this.player.pause();
    this.playButton.style.display = 'block';
  }

  initPlayer() {
    if (!this.domReady) {
      return;
    }
    this.video = document.createElement('video');
    const options = {};
    const videoEl = this.video;
    const canvasEl = this.canvas;
    const canvasContext = canvasEl.getContext('2d');
    // eslint-disable-next-line no-undef
    const player = videojs(videoEl, options);
    this.player = player;
    let prevAss;
    const renderToCanvas = () =>
      requestAnimationFrame(() => {
        if (player.isDisposed() || player.paused()) {
          return;
        }
        const { videoWidth, videoHeight } = videoEl;
        if (videoWidth === 0 || videoHeight === 0) {
          return renderToCanvas();
        }
        this.resizeSubtitle();
        canvasEl.width = videoWidth;
        canvasEl.height = videoHeight;
        canvasContext.drawImage(videoEl, 0, 0, videoWidth, videoHeight);
        canvasContext.font = 'bold 80px serif';
        canvasContext.fillStyle = 'rgb(216, 44, 102)';
        canvasContext.strokeStyle = 'rgb(243, 235, 165)';
        canvasContext.strokeText(this.word, 30, 80);
        canvasContext.fillText(this.word, 30, 80);
        const currentTime = player.currentTime() * 1000;
        const ass =
          this.ass.find(({ start, end }) => {
            // console.log("start, end, currentTime:", start, end, currentTime);
            return start <= currentTime && end >= currentTime;
          }) || prevAss;
        if (ass !== prevAss) {
          this.subtitleContainer.innerHTML = '';
          prevAss = ass;
          if (ass !== undefined) {
            const subtitles = ass.subtitles || [];
            for (let i = 0; i < subtitles.length; i += 1) {
              // console.log('i ===>', i);
              const subtitle = subtitles[i];
              const subtitleStrategy =
                this.subtitleStrategies[i] || this.defaultSubtitleStrategy;
              const p = document.createElement('p');
              if (subtitleStrategy.show === false) {
                continue;
              }
              p.style.color = subtitleStrategy.color;
              p.style.font = subtitleStrategy.font;
              p.style.background = subtitleStrategy.background;
              p.style.margin = '0';
              const words = subtitle.split(' ');
              words.forEach((w) => {
                const span = document.createElement('span');
                span.innerHTML = `${w} `;
                // const isTransform = false;
                const emphasized =
                  w
                    .split(/[^a-zA-Z'-]+/)
                    .map((s) => s.toLowerCase())
                    .flat()
                    .filter((s) => s.length > 1)
                    .filter((w) => w === this.word).length > 0;
                if (emphasized) {
                  span.style.color = subtitleStrategy.emphasisColor;
                  span.style.font = subtitleStrategy.emphasisFont;
                  span.style.margin = '0 5px';
                }
                p.appendChild(span);
              });
              this.subtitleContainer.appendChild(p);
            }
          }
        }
        renderToCanvas();
      });
    player.on('play', () => renderToCanvas());
  }

  load(src, word) {
    if (!this.domReady) {
      this.attach();
    }
    let { player } = this;
    if (this.isDirty && !player.isDisposed()) {
      player.dispose();
    }
    this.initPlayer();
    this.word = word;
    player = this.player;
    player.src({ type: 'video/mp4', src });
    this.isDirty = true;
    return fs.readFile(`${src}.ass`).then((res) => {
      const { encoding } = jschardet.detect(res);
      this.ass = new Ass(res.toString(encoding)).parse();
    });
  }

  setPlaySpeed(speed) {
    this.playSpeed = speed;
    const { player } = this;
    if (player) {
      player.ready(() => {
        player.playbackRate(speed);
      });
    }
  }

  play(subtitleStrategies) {
    const { player } = this;
    this.subtitleStrategies = subtitleStrategies;
    return new Promise((resolve, reject) => {
      player.ready(() => {
        player.play().catch((e) => {
          console.log('play error:', e);
        });
        player.playbackRate(this.playSpeed);
      });
      player.on('ended', () => resolve());
      player.on('dispose', () => reject(new Error('source changed!')));
    });
  }
}

export const myPlayer = new MyPlayer('video-box');
