import React, { useState, useEffect, memo } from 'react';
import dayjs from 'dayjs';
import { supermemo, SuperMemoGrade } from 'supermemo';
import { Button, Empty } from 'antd';
import PATH from 'path';
import { promises as fs } from 'fs';
import { v5 as uuidv5 } from 'uuid';
import { BehaviorSubject } from 'rxjs';
import { dbRoot } from '../../constant';
import { mkdir } from '../../util/mkdir';
import { FlashCard } from '../../types/FlashCard';
import { CARD_COLLECTION_NAMESPACE } from '../../compontent/FlashCardMaker/FlashCardMaker';
import { playSubtitle$ } from '../../state/user_input/playClipAction';
import { openSentence$ } from '../../state/user_input/openSentenceAction';

const L1 = PATH.join(dbRoot, 'flash_cards');
mkdir(L1);
type CardIndexMap = { [prop: string]: string };

const loadCardIndexMap = () => {
  return fs
    .readFile(PATH.join(L1, 'index.json'))
    .then((buf) => {
      return JSON.parse(buf.toString()) as CardIndexMap;
    })
    .catch(() => {
      return {};
    })
    .then((cardIndexMap) => {
      return Object.keys(cardIndexMap);
    })
    .catch(() => [] as string[]);
};

const loadFlashCardsOfCollectionId = (collectionId: string) => {
  const dir = PATH.join(L1, collectionId);
  return fs
    .readdir(dir)
    .then((files) => {
      return Promise.all(
        files.map((file) => fs.readFile(PATH.join(dir, file)))
      );
    })
    .then((bufs) => {
      return bufs
        .map((buf) => {
          try {
            const flashCard = JSON.parse(buf.toString()) as FlashCard;
            flashCard.front.subtitles = flashCard.front.subtitles || [];
            return flashCard;
          } catch (err) {
            return null;
          }
        })
        .filter((f) => {
          return f !== null && f.dueDate < Date.now();
        }) as FlashCard[];
    })
    .catch(() => {
      return [] as FlashCard[];
    });
};
const loadNextCardAction$ = new BehaviorSubject<any>(1);

const Component = () => {
  const [cardToReview, setCardToReview] = useState<FlashCard | null>(null);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    let currentCollectionIndex = 0;
    let cardsToReview = [] as FlashCard[];

    // load collections
    let collectionIdListPromise = loadCardIndexMap();

    loadNextCardAction$.subscribe({
      next: async () => {
        if (cardsToReview.length > 0) {
          // 从缓存中获取。
          const card = cardsToReview.shift();
          if (card !== undefined) {
            setCardToReview(card);
            setShowBack(false);
            return;
          }
        }
        const collectionIdList = await collectionIdListPromise; // 等待集合列表加载完毕
        while (collectionIdList.length > currentCollectionIndex) {
          const collectionId = collectionIdList[currentCollectionIndex];
          currentCollectionIndex += 1;
          const flashCards = await loadFlashCardsOfCollectionId(collectionId);
          if (flashCards.length > 0) {
            const card = flashCards.shift();
            if (flashCards.length > 0) {
              cardsToReview = flashCards;
            }
            if (card !== undefined) {
              setCardToReview(card);
              setShowBack(false);
              return;
            }
          }
        }
        setCardToReview(null);
        setShowBack(false);
      },
    });
  }, []);
  if (cardToReview === null) {
    return <Empty description="没有需要回顾的卡片。"></Empty>;
  }

  function practice(flashcard: FlashCard, grade: SuperMemoGrade) {
    const { interval, repetition, efactor } = supermemo(flashcard, grade);
    const dueDate = dayjs(Date.now()).add(interval, 'day').valueOf();
    return { ...flashcard, interval, repetition, efactor, dueDate };
  }
  const practiceAndSave = (cardToReview: FlashCard, grade: SuperMemoGrade) => {
    const updatedCard = practice(cardToReview, grade);
    console.log('updatedCard:', updatedCard);
    const collectionId = uuidv5(
      updatedCard.front.word,
      CARD_COLLECTION_NAMESPACE
    );
    const cardFile = PATH.join(L1, collectionId, `${updatedCard.id}.json`);
    console.log('cardFile:', cardFile);
    return fs.writeFile(cardFile, JSON.stringify(updatedCard));
  };
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        margin: '0 14px',
      }}
    >
      <div
        style={{
          flexGrow: 1,
        }}
      >
        <div>{cardToReview.front.word}</div>
        <div
          style={{
            borderBottom: '1px solid #ddd',
            margin: '14px 0',
            paddingBottom: '14px',
          }}
        >
          <div>
            {cardToReview.front.subtitles.map((subtitle, index) => {
              return (
                <div
                  key={index}
                  tabIndex={0}
                  onClick={() => {
                    playSubtitle$.next(subtitle);
                  }}
                  onKeyDown={(e) => {
                    if (e.key.toLowerCase() === 'enter') {
                      playSubtitle$.next(subtitle);
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                  }}
                >
                  - {PATH.basename(subtitle.file)}
                </div>
              );
            })}
          </div>
          <div>
            {cardToReview.front.sentences.map((s, index) => {
              return (
                <div
                  key={index}
                  tabIndex={0}
                  onClick={() => {
                    console.log('open sentence in flashCard:', s);
                    openSentence$.next(s);
                  }}
                  onKeyDown={(e) => {
                    if (e.key.toLowerCase() === 'enter') {
                      openSentence$.next(s);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {index}. {s.content}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          {!showBack && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'black',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              tabIndex={0}
              onKeyDown={() => {}}
              onClick={() => {
                setShowBack(true);
              }}
            >
              显示释义
            </div>
          )}
          <div>{cardToReview.back}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Button
          onClick={() => {
            practiceAndSave(cardToReview, 0);
            loadNextCardAction$.next(1);
          }}
        >
          complete blackout.
        </Button>
        <Button
          onClick={() => {
            practiceAndSave(cardToReview, 1);
            loadNextCardAction$.next(1);
          }}
        >
          incorrect response; the correct one remembered.
        </Button>
        <Button
          onClick={() => {
            practiceAndSave(cardToReview, 2);
            loadNextCardAction$.next(1);
          }}
        >
          incorrect response; where the correct one seemed easy to recall.
        </Button>
        <Button
          onClick={() => {
            practiceAndSave(cardToReview, 3);
            loadNextCardAction$.next(1);
          }}
        >
          correct response recalled with serious difficulty.
        </Button>
        <Button
          onClick={() => {
            practiceAndSave(cardToReview, 4);
            loadNextCardAction$.next(1);
          }}
        >
          correct response after a hesitation.
        </Button>
        <Button
          onClick={() => {
            practiceAndSave(cardToReview, 5);
            loadNextCardAction$.next(1);
          }}
        >
          perfect response.
        </Button>
      </div>
    </div>
  );
};
export const CardReview = memo(Component);
