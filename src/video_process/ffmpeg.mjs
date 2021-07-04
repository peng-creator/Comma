import child_process from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import jschardet from 'jschardet';
import cpFile from 'cp-file';
// import pathToFfmpeg from 'ffmpeg-static';
import { from, lastValueFrom, Observable } from 'rxjs';
import { catchError, mapTo, switchMap, map } from 'rxjs/operators';
import { assContentToCutProject, millisecondsToTime } from '../util/index.mjs';

const pathToFfmpeg = path.resolve(__dirname, '../assets/ffmpeg');
const pathToFfprobe = path.resolve(__dirname, '../assets/ffprobe');
console.log('pathToFfmpeg:', pathToFfmpeg);

class Exec {
  constructor(command) {
    this.command = command;
    this.args = [];
  }

  addArg(arg) {
    this.args.push(arg);
    return this;
  }

  run() {
    return new Observable((observer) => {
      console.log(`command: ${this.command} ${this.args.join(' ')}`);
      const spawnObj = child_process.spawn(this.command, this.args);
      const { stderr, stdout } = spawnObj;
      let error;
      let out;
      stderr.on('data', (data) => {
        if (error === undefined) {
          error = data;
        } else {
          error = Buffer.concat([error, data], error.length + data.length);
        }
      });
      stdout.on('data', (data) => {
        if (out === undefined) {
          out = data;
        } else {
          out = Buffer.concat([out, data], out.length + data.length);
        }
      });
      spawnObj.on('close', (code) => {
        // console.log(`close code : ${code}`);
        if (out) {
          // resolve(out.toString());
          observer.next(out.toString());
        } else if (error) {
          // resolve(error.toString());
          observer.next(error.toString());
        }
        observer.complete();
      });
      spawnObj.on('exit', (code) => {
        console.log(`exit code : ${code}`);
        // observer.error(code);
      });
      spawnObj.on('error', (err) => {
        console.error('启动子进程失败', err);
        observer.complete();
      });
      return () => {
        spawnObj.kill();
      };
    });
  }
}

const getSubtitleFilePathFromSourcePath = (source) => {
  const basename = path.basename(source);
  const basenameLength = basename.length;
  const extname = path.extname(source);
  return path.join(
    path.dirname(source),
    `${basename.slice(0, basenameLength - extname.length)}.ass`
  );
};

function sliceSubtitle(source, index, output, start, length) {
  const subtitleFilePath = getSubtitleFilePathFromSourcePath(source);
  return new Exec(pathToFfmpeg)
    .addArg('-ss')
    .addArg(start)
    .addArg('-i')
    .addArg(subtitleFilePath)
    .addArg('-to')
    .addArg(length)
    .addArg('-map')
    .addArg(`s:${index}`)
    .addArg('-an')
    .addArg('-vn')
    .addArg('-scodec')
    .addArg('copy')
    .addArg(output)
    .addArg('-y')
    .run();
}

async function getEnglishSubtitle(source) {
  const subtitleFilePath = getSubtitleFilePathFromSourcePath(source);
  console.log(`subtitle file: ${subtitleFilePath}`);
  try {
    const stat = await fs.stat(subtitleFilePath);
    console.log('stat: ', stat);
  } catch (err) {
    throw new Error(`视频文件没有字幕: ${source}`);
  }
  const txt = await fs.readFile(subtitleFilePath);
  const { encoding } = jschardet.detect(txt);
  return txt.toString(encoding);
}

export async function getWordsWithTimeSection(source) {
  const content = await getEnglishSubtitle(source);
  return assContentToCutProject(content);
}
/**
 *
 * @param source 源视频文件路径
 * @param start 剪辑开始时间
 * @param length 剪辑时间长度
 * @param output 输出路径
 * @param vcodec  编码器 h264 h264_videotoolbox
 * @param crf Constant Rate Factor，范围 0-51: 0无损 23默认 51几乎全损，建议范围18-28，18是几乎无损。
 * @param preset veryslow slower slow medium fast faster veryfast superfast ultrafast ， 越慢质量越好，文件越小，耗时越长
 * @returns
 */
export function cutVideo(
  source,
  start,
  length,
  output,
  vcodec = 'h264',
  crf = 28,
  preset = 'ultrafast'
) {
  const getSubtitlePromise = sliceSubtitle(
    source,
    0,
    `${output}.ass`,
    start,
    length
  );
  // const getClipPromise = exec(`${pathToFfmpeg} -ss ${start} -i "${source}" -to ${length}  -vcodec ${vcodec} -crf ${crf} -preset ${preset}  ${output} -y`);
  const getClipPromise = lastValueFrom(
    new Exec(pathToFfmpeg)
      .addArg('-ss')
      .addArg(start)
      .addArg('-i')
      .addArg(source)
      .addArg('-to')
      .addArg(length)
      .addArg('-vcodec')
      .addArg(vcodec)
      .addArg('-crf')
      .addArg(crf)
      .addArg('-preset')
      .addArg(preset)
      .addArg(output)
      .addArg('-y')
      .run()
  );
  return Promise.all([getSubtitlePromise, getClipPromise]);
}

function skipConvert(source) {
  return new Exec(pathToFfprobe)
    .addArg('-show_format')
    .addArg('-show_streams')
    .addArg('-print_format')
    .addArg('json')
    .addArg(source)
    .run()
    .pipe(
      map((info) => {
        if (typeof info === 'string') {
          try {
            const { streams } = JSON.parse(info);
            let videoCodecSupport = false;
            let audioCodecSupport = false;
            if (streams) {
              streams.forEach((value) => {
                // mp4, webm, ogg
                if (
                  value.codec_type === 'video' &&
                  (value.codec_name === 'h264' ||
                    value.codec_name === 'vp8' ||
                    value.codec_name === 'theora')
                ) {
                  videoCodecSupport = true;
                }
                if (
                  value.codec_type === 'audio' &&
                  (value.codec_name === 'aac' || value.codec_name === 'vorbis')
                ) {
                  audioCodecSupport = true;
                }
              });
            }
            return videoCodecSupport && audioCodecSupport;
          } catch (e) {
            return false;
          }
        }
        return false;
      })
    );
}

export function convertToMp4(
  source,
  output,
  vcodec = 'h264',
  crf = 28,
  preset = 'ultrafast'
) {
  return skipConvert(source).pipe(
    switchMap((shouldSkip) => {
      console.log('should skip?:', shouldSkip);
      if (!shouldSkip) {
        return from(fs.stat(output)).pipe(
          catchError(() =>
            new Exec(pathToFfmpeg)
              .addArg('-i')
              .addArg(source)
              .addArg('-vcodec')
              .addArg(vcodec)
              .addArg('-crf')
              .addArg(crf)
              .addArg('-preset')
              .addArg(preset)
              .addArg(output)
              .addArg('-y')
              .run()
          )
        );
      }
      return from(cpFile(source, output));
    }),
    mapTo(source)
  );
}

export async function getThumbnail(source, output, time = 0) {
  try {
    await fs.stat(output);
    return output;
  } catch (err) {
    console.log('没有缩略图，准备生成。');
  }
  await lastValueFrom(
    new Exec(pathToFfmpeg)
      .addArg('-ss')
      .addArg(millisecondsToTime(time))
      .addArg('-i')
      .addArg(source)
      .addArg('-vframes')
      .addArg(2)
      .addArg(output)
      .addArg('-y')
      .run()
  );

  return output;
}
