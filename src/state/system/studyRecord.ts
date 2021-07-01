import { BehaviorSubject } from 'rxjs';
import { getStudyRecord } from '../../database/wordbook';
import { StudyRecord } from '../../types/StudyRecord';

export const studyRecord$ = new BehaviorSubject({} as StudyRecord);

getStudyRecord()
  .then((studyRecord) => {
    if (studyRecord !== null) {
      studyRecord$.next(studyRecord);
    }
  })
  .catch((e) => {
    console.log('get study record faild on startup:', e);
  });
