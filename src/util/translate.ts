import axios from 'axios';
import md5 from 'md5';

function randomString(e: number): string {
  e = e || 32;
  const t = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  const a = t.length;
  let n = '';
  for (let i = 0; i < e; i += 1) n += t.charAt(Math.floor(Math.random() * a));
  return n;
}

export const translate = async (sentence: string) => {
  const appId = '20220122001064302';
  const secret = 'rwdIN9aozliHWPWs8cO8';
  const salt = randomString(32);
  // appid+q+salt+密钥
  const string1 = appId + sentence + salt + secret;
  const sign = md5(string1);
  const data = `q=${sentence}&from=auto&to=zh&appid=${appId}&salt=${salt}&sign=${sign}&dict=0`;
  // const data = {
  //   q: sentence,
  //   from: 'auto',
  //   to: 'zh',
  //   appid: appId,
  //   salt,
  //   sign,
  //   dict: 0,
  // };
  return axios
    .post('https://fanyi-api.baidu.com/api/trans/vip/translate', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    .then((res) => res.data);
};
