import { promises as fs } from 'fs';
import { BehaviorSubject } from 'rxjs';
import playSVG from '../../assets/play.svg';

export class SubtitleStrategy {
  constructor({
    font = '1em serif',
    color = 'rgb(243, 235, 165)',
    emphasisFont = 'bold 1.2em "Fira Sans", serif',
    emphasisColor = 'rgb(128, 31, 115)',
    show = true,
    background = 'rgb(169, 118, 236)',
  } = {}) {
    this.font = font;
    this.color = color;
    this.emphasisColor = emphasisColor;
    this.emphasisFont = emphasisFont;
    this.show = show;
    this.background = background;
    this.shouldPlay = false;
  }
}

export class MyPlayer {
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
    this.timePadding = 6000;
    this.showSubtitle = true;
    // 片段
    this.clips = [];
    this.clipLoop = true; // 片段循环
    this.playByClip = true; // 按片段播放。
    this.currClipIndex = 0; // 当前播放的片段
    this.currClip = undefined;
    this.rightClickWord = '';
    this.volume = 1;
    this.isPlaying = false;
    this.isPlaying$ = new BehaviorSubject(false);
    this.currentTime$ = new BehaviorSubject(0); // 播放到第几秒
    this.duration$ = new BehaviorSubject(0); // 总共时长多少秒
    this.start$ = new BehaviorSubject(0); // 进度条起始位置
    this.end$ = this.duration$; // 进度条结束位置
    this.willEndResolve = () => {};
    this.addWordsToWordBook = () => {};
    this.menu = document.createElement('div');
    this.menu.className = 'word-right-click-menu';
    this.menu.rightClickItem = document.createElement('div');
    this.menu.rightClickItem.innerHTML = '加入单词本';
    this.menu.rightClickItem.className = 'word-right-click-menu-item';
    this.menu.appendChild(this.menu.rightClickItem);
    this.menu.rightClickItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.menu.style.height = 0;
      if (this.rightClickWord.length > 0) {
        console.log('addWordsToWordBook:', this.rightClickWord);
        this.addWordsToWordBook(this.rightClickWord.toLowerCase());
      }
    });
    window.addEventListener('click', () => {
      this.menu.style.height = 0;
    });
    this.searchWord = () => {};
    window.addEventListener('resize', () => {
      this.resizeSubtitle();
    });
  }

  setShowSubtitle(show) {
    this.showSubtitle = show;
  }

  setPlayByClip(playByClip) {
    this.playByClip = playByClip;
  }

  setCurrClipIndex(index) {
    this.currClipIndex = index;
    this.currClip = this.clips[index];
  }

  setClipLoop(loop) {
    this.clipLoop = loop;
  }

  setClips(clips) {
    this.clips = clips;
  }

  setSubtitle(subtitles) {
    this.ass = subtitles;
  }

  getSubtitle(subtitles) {
    return this.ass;
  }

  setCurrentTime(time) {
    console.log('in player.js, setCurrentTime:', time);
    this.player.currentTime(time / 1000);
  }

  onAddWordsToWordBook(callback) {
    this.addWordsToWordBook = callback;
  }

  onSearchWord(callback) {
    this.searchWord = callback;
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

    this.container.appendChild(this.menu);

    const subtitleContainerClassName = 'subtitle-container';
    let subtitleContainer = this.container.querySelector(
      `.${subtitleContainerClassName}`
    );
    if (subtitleContainer === null || subtitleContainer === undefined) {
      subtitleContainer = document.createElement('div');
      subtitleContainer.className = subtitleContainerClassName;
      subtitleContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        this.menu.style.height = '0px';
      });
      subtitleContainer.addEventListener('mouseup', (e) => {
        e.stopPropagation();
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
      playButton.style.display = 'block';
      this.container.appendChild(playButton);
    }
    this.playButton = playButton;
  }

  setVolume(volume) {
    console.log('setVolume:', volume);
    volume /= 100;
    this.volume = volume;
    this.player.volume(volume);
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
    this.shouldPlay = true;
    this.play();
    this.hidePlayButton();
    this.isPlaying = true;
    this.isPlaying$.next(true);
  }

  pause() {
    if (this.player === null) {
      return;
    }
    this.player.pause();
    this.playButton.style.display = 'block';
    this.shouldPlay = false;
    this.isPlaying = false;
    this.isPlaying$.next(false);
  }

  initPlayer(clips = []) {
    if (!this.domReady) {
      return;
    }
    this.video =
      this.container.querySelector('video') || document.createElement('video');
    this.video.style.width = '100%';
    this.video.style.height = 'auto';
    const options = {
      controls: false,
      loadingSpinner: false,
    };
    const videoEl = this.video;
    this.container.appendChild(this.video);
    // eslint-disable-next-line no-undef
    const player = videojs(videoEl, options);
    console.log('assign player');
    this.player = player;
    console.log('set volum:', this.volume);
    player.volume(this.volume);
    this.setClips(clips);
    let prevAss;
    let prevShowSubtitle;
    if (this.playByClip && this.currClip !== undefined) {
      console.log(
        'this.playByClip && this.currClip !== undefined , so this.setCurrentTime'
      );
      this.setCurrentTime(this.currClip.start);
    }
    player.on('timeupdate', () => {
      if (player.isDisposed()) {
        return;
      }
      if (player.paused()) {
        return;
      }
      const duration = player.duration();
      this.duration$.next(duration);
      const current = player.currentTime();
      this.currentTime$.next(current);
      console.log(
        'currentTime:',
        current,
        'clips:',
        this.clips,
        'currClipIndex:',
        this.currClipIndex,
        'currentClip',
        this.currClip,
        ' this.clipLoop:',
        this.clipLoop
      );
      if (
        this.playByClip === false &&
        this.clipLoop === true &&
        current * 1000 >= this.currClip.end
      ) {
        console.log(`this.playByClip === false &&
        this.clipLoop === true &&
        current * 1000 >= this.currClip.end, so this.setCurrentTime(this.currClip.start)`);
        this.setCurrentTime(this.currClip.start);
      } else if (
        this.playByClip === true &&
        this.currClip !== undefined &&
        current * 1000 >= this.currClip.end
      ) {
        if (!this.clipLoop) {
          console.log(
            'this.setCurrClipIndex(this.currClipIndex + 1):',
            this.currClipIndex + 1
          );
          this.setCurrClipIndex(this.currClipIndex + 1);
        }
        this.setCurrentTime(this.currClip.start);
      }

      const { videoWidth, videoHeight } = videoEl;
      if (videoWidth === 0 || videoHeight === 0) {
        return;
      }
      this.resizeSubtitle();
      const currentTime = current * 1000;
      const ass =
        this.ass.find(({ start, end }, index) => {
          const isCurrent = start <= currentTime && end >= currentTime;
          if (isCurrent) {
            console.log(
              'start, end, currentTime:',
              start,
              end,
              currentTime,
              index
            );
          }
          return isCurrent;
        }) || prevAss;
      console.log('current subtitle is:', ass);
      if (this.playByClip === false && this.clipLoop === false) {
        const nextIndex = this.ass.indexOf(ass);
        console.log(
          'this.setCurrClipIndex(nextIndex)',
          nextIndex,
          currentTime,
          ass
        );
        this.setCurrClipIndex(nextIndex);
      }
      const renderSubtitle = () => {
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
            subtitle.split(/\s/).forEach((w) => {
              const span = document.createElement('span');
              span.style.cursor = 'pointer';
              let word = w.replace(/[^a-zA-Z'-]+/g, '');
              span.addEventListener('click', () => {
                if (word.length > 0) {
                  this.searchWord(word);
                }
              });
              span.addEventListener('contextmenu', (e) => {
                if (word.length === 0) {
                  return;
                }
                e.preventDefault();
                const { clientX, clientY } = e;
                let left = clientX;
                let top = clientY - 30;
                if (clientX + 100 >= this.subtitleContainer.clientWidth) {
                  left = this.subtitleContainer.clientWidth - 100;
                }
                this.menu.style.left = `${left}px`;
                // this.menu.style.bottom = `${this.subtitleContainer.clientHeight}px`;
                this.menu.style.top = `${top}px`;
                this.menu.style.height = 'auto';
                this.rightClickWord = word;
              });
              span.innerHTML = `${w} `;
              p.appendChild(span);
            });
            this.subtitleContainer.appendChild(p);
          }
        }
      };
      if (
        (ass !== prevAss && this.showSubtitle === true) ||
        (prevShowSubtitle === false && this.showSubtitle === true)
      ) {
        console.log('显示字幕：', this.showSubtitle);
        this.subtitleContainer.innerHTML = '';
        renderSubtitle();
      } else if (
        !ass ||
        ass.end <= currentTime ||
        this.showSubtitle === false
      ) {
        console.log('显示字幕：', this.showSubtitle);
        this.subtitleContainer.innerHTML = '';
      } else {
        console.log('else, 显示字幕：', this.showSubtitle);
      }
      prevShowSubtitle = this.showSubtitle;
      prevAss = ass;
    });
  }

  load(file) {
    if (!this.domReady) {
      this.attach();
    }
    let { player } = this;
    if (this.isDirty && !player.isDisposed()) {
      player.dispose();
    }
    this.initPlayer();
    player = this.player;
    player.src({ type: 'video/mp4', src: file });
    this.isDirty = true;
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

  hidePlayButton() {
    if (this.playButton !== undefined && this.playButton !== null) {
      this.playButton.style.display = 'none';
    }
  }

  play() {
    if (this.shouldPlay) {
      this.hidePlayButton();
      this.player.play().catch((e) => {
        console.log('play error:', e);
      });
    }
  }
}
