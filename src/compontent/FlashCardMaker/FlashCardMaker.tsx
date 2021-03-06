import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
} from 'antd';
import {
  DeleteOutlined,
  EditFilled,
  PlayCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import * as remote from '@electron/remote';
import PATH from 'path';
import { promises as fs } from 'fs';
import { v5 as uuidv5 } from 'uuid';
import { BehaviorSubject, Subject } from 'rxjs';
import { SearchResult } from 'minisearch';
import { flashCardKeyword$ } from '../../state/user_input/flashCardKeyword';
import { FlashCard } from '../../types/FlashCard';
import { openSentence$ } from '../../state/user_input/openSentenceAction';
import { dbRoot } from '../../constant';
import { mkdir } from '../../util/mkdir';
import { stringFolder } from '../../util/string_util';
import { playSubtitle$ } from '../../state/user_input/playClipAction';
import { millisecondsToTime } from '../../util/time_util.mjs';
import { Subtitle } from '../../types/Subtitle';
import { LazyInput } from '../LazyInput/LazyInput';
import {
  addSearchItems,
  searchFlashCardCollections,
} from '../../flashCardSearch';
import { PDFNote } from '../../types/PDFNote';
import { openPdf$ } from '../../state/user_input/openPdfAction';

const { Option } = Select;

const MY_NAMESPACE = '2a671a64-40d5-491e-99b0-da01ff1f3341';
export const CARD_COLLECTION_NAMESPACE = '3b671a64-40d5-491e-99b0-da01ff1f3341';

const newFlashCard = (keyword: string): FlashCard => {
  return {
    id: uuidv5(keyword + Date.now(), MY_NAMESPACE),
    front: {
      word: keyword,
      subtitles: [],
      sentences: [],
      pdfNote: [],
    },
    back: '',
    dueDate: Date.now(),
    interval: 0,
    repetition: 0,
    efactor: 2.5,
    clean: true,
    hasChanged: false,
  };
};

const L1 = PATH.join(dbRoot, 'flash_cards');
mkdir(L1);

type CardIndexMap = { [prop: string]: string };

const cardIndexMapPromise = fs
  .readFile(PATH.join(L1, 'index.json'))
  .then((buf) => {
    return JSON.parse(buf.toString()) as CardIndexMap;
  })
  .catch(() => {
    return {};
  });

export const pdfNote$ = new Subject<PDFNote>();
export const openNote$ = new BehaviorSubject<PDFNote | null>(null);
export const saveCard$ = new Subject<FlashCard>();

const saveCard = async (cardToSave: FlashCard, cardIndexMap: CardIndexMap) => {
  saveCard$.next(cardToSave);
  // ??????????????????
  addSearchItems([
    {
      id: cardToSave.front.word,
    },
  ]);
  // ???????????????
  cardToSave.clean = false;
  cardToSave.hasChanged = false;
  const keyword = cardToSave.front.word;
  const collectionId = uuidv5(keyword, CARD_COLLECTION_NAMESPACE);
  cardIndexMap[collectionId] = keyword;
  const dir = PATH.join(L1, collectionId);
  return mkdir(dir)
    .then(() => {
      const _cardToSave = { ...cardToSave, hasChanged: false };
      console.log('cardToSave:', _cardToSave);
      return fs.writeFile(
        PATH.join(dir, `${_cardToSave.id}.json`),
        JSON.stringify(_cardToSave)
      );
    })
    .then(() => {
      return fs.writeFile(
        PATH.join(L1, 'index.json'),
        JSON.stringify(cardIndexMap)
      );
    })
    .then(() => {
      cardToSave.hasChanged = false;
    })
    .catch((e) => {
      console.log('??????????????????:', e);
    });
};

export const addSubtitle$ = new Subject<Subtitle>();
export const openCardReviewAction$ = new Subject();

const Component = () => {
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]); // ????????????????????????????????????????????????????????????
  const [currentCard, setCurrentCard] = useState<FlashCard | null>(null);
  const [cardCollections, setCardCollections] = useState<string[]>([]); // ???????????????
  const [currentCollection, setCurrentCollection] = useState('');
  const [cardIndexMapCache, setCardIndexMapCache] = useState<CardIndexMap>({});
  const [searchResultList, setSearchResultList] = useState<SearchResult[]>([]);

  useEffect(() => {
    let lastKeyword = '';
    let cacheFlashCards: FlashCard[] = [];
    let cardIndexMapCache: CardIndexMap = {};
    let cardCollections: string[] = [];
    cardIndexMapPromise
      .then((cardIndexMap: { [prop: string]: string }) => {
        cardIndexMapCache = cardIndexMap;
        setCardIndexMapCache(cardIndexMapCache);
        const collectionKeywordList = [...new Set(Object.values(cardIndexMap))];
        setCardCollections(collectionKeywordList);
        cardCollections = collectionKeywordList;
        addSearchItems(
          collectionKeywordList.map((id) => {
            return { id };
          })
        );
      })
      .catch((e) => {
        console.log('??????????????????????????????');
      });

    const sp = flashCardKeyword$.subscribe({
      next: async (keyword) => {
        // ??????miniSearch??????
        const result = searchFlashCardCollections(keyword);
        console.log('keyword:', keyword, ' search card collections:', result);
        setSearchResultList(result);
        if (keyword === '') {
          return;
        }
        // ??????????????????????????????????????????
        let nextFlashCards: FlashCard[] = [...cacheFlashCards];
        const addNewFlashCardToCollection = () => {
          cacheFlashCards = nextFlashCards;
          const lastOne = nextFlashCards[nextFlashCards.length - 1];
          if (!(lastOne && lastOne.clean)) {
            nextFlashCards.push(newFlashCard(keyword));
          }
          console.log(
            'FlashCardMaker useEffect setFlashCards:',
            nextFlashCards
          );
          setFlashCards(nextFlashCards);
          console.log(
            'FlashCardMaker useEffect setCurrentCardIndex:',
            nextFlashCards.length - 1
          );
          setCurrentCard(nextFlashCards[0]);
          console.log(
            'nextFlashCards:',
            nextFlashCards,
            'setCurrentCardIndex:',
            nextFlashCards.length - 1
          );
          cardCollections = [...new Set([...cardCollections, keyword])];
          setCardCollections(cardCollections);
          setCurrentCollection(keyword);
        };
        if (keyword === lastKeyword) {
          addNewFlashCardToCollection();
          return;
        }
        lastKeyword = keyword;
        // 0.???????????????????????????
        console.log('save current collection:', cacheFlashCards);
        try {
          await Promise.all(
            cacheFlashCards
              .filter(
                (card) => card.clean === false && card.hasChanged === true
              )
              .map((card) => saveCard(card, cardIndexMapCache))
          );
        } catch (e) {
          console.log('???????????????????????????', e);
        }
        // 1.??????????????????
        const dir = PATH.join(L1, uuidv5(keyword, CARD_COLLECTION_NAMESPACE));
        const loadedFlashCards = await fs
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
                return f !== null;
              });
          })
          .catch((e) => {
            return [];
          });
        console.log('loadedFlashCards:', loadedFlashCards);
        nextFlashCards = (loadedFlashCards as FlashCard[]) || [];
        // ???????????????????????????????????????
        addNewFlashCardToCollection();
      },
    });
    return () => sp.unsubscribe();
  }, []);

  useEffect(() => {
    const sp = addSubtitle$.subscribe({
      next(subtitle: Subtitle) {
        if (currentCard === null) {
          message.warn('?????????????????????');
          return;
        }
        currentCard.front.subtitles.push(subtitle);
        currentCard.clean = false;
        currentCard.hasChanged = true;
        setFlashCards([...flashCards]);
      },
    });
    return () => sp.unsubscribe();
  }, [currentCard]);

  useEffect(() => {
    const sp = pdfNote$.subscribe({
      next(note) {
        if (note === null) {
          return;
        }
        if (currentCard === null) {
          message.warn('?????????????????????');
          return;
        }
        if (!currentCard.front.pdfNote) {
          currentCard.front.pdfNote = [];
        }
        currentCard.front.pdfNote.push(note);
        currentCard.clean = false;
        currentCard.hasChanged = true;
        setFlashCards([...flashCards]);
      },
    });
    return () => sp.unsubscribe();
  }, [currentCard]);

  const cardCollectionSelector = (
    <Select
      style={{ width: '100%' }}
      showSearch
      placeholder="??????????????????"
      value={currentCollection || null}
      onChange={(collectionKeyword) => {
        console.log('select changed:', collectionKeyword);
        flashCardKeyword$.next(collectionKeyword);
      }}
      onSearch={(e) => {
        console.log('on search changed:', e);
      }}
    >
      {cardCollections.map((collection) => {
        return (
          <Option value={collection} key={collection}>
            {collection}
          </Option>
        );
      })}
    </Select>
  );
  if (flashCards.length === 0 && cardCollections.length === 0) {
    return (
      <Empty description="????????????">???????????????????????????????????????????????????</Empty>
    );
  }

  const openReviewBtn = (
    <Button
      type="ghost"
      style={{ color: 'white' }}
      onClick={() => {
        openCardReviewAction$.next('');
      }}
    >
      Super Memo
    </Button>
  );

  if (flashCards.length === 0 && cardCollections.length !== 0) {
    return (
      <div style={{ display: 'flex' }}>
        <div>{openReviewBtn}</div>
        <div style={{ flexGrow: 1, display: 'flex' }}>
          <div
            style={{ margin: '0 14px', display: 'flex', alignItems: 'center' }}
          >
            ????????????
          </div>
          <div style={{ flexGrow: 1 }}>{cardCollectionSelector}</div>
        </div>
      </div>
    );
  }

  console.log('flashCards:', flashCards, 'currentCard:', currentCard);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          marginTop: '10px',
          marginBottom: '10px',
          display: 'flex',
          width: '100%',
          overflow: 'hidden',
          minHeight: '32px',
        }}
      >
        <div>{openReviewBtn}</div>
        <div>
          {currentCard !== null && (
            <Button
              type="ghost"
              style={{ color: 'white' }}
              onClick={() => {
                saveCard(currentCard, cardIndexMapCache)
                  .then(() => setFlashCards([...flashCards]))
                  .then(() => {
                    const lastCard = flashCards[flashCards.length - 1];
                    if (lastCard.clean === false) {
                      const nextFlashCards = [
                        ...flashCards,
                        newFlashCard(lastCard.front.word),
                      ];
                      setFlashCards(nextFlashCards);
                    }
                  })
                  .catch((e) => message.error(e.message));
              }}
            >
              <SaveOutlined />
            </Button>
          )}
        </div>
        <div
          style={{ lineHeight: '30px', marginLeft: '12px', minWidth: '56px' }}
        >
          ????????????
        </div>
        <div style={{ width: '30%', marginLeft: '12px', flexGrow: 1 }}>
          {cardCollectionSelector}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          height: 'calc(100% - 32px)',
          overflow: 'hidden',
        }}
      >
        {searchResultList.length > 0 && (
          <div
            style={{
              width: '30%',
              flexGrow: 1,
              height: '100%',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                borderBottom: '1px solid #ddd',
              }}
            >
              ?????????????????????
            </div>
            <div>
              {searchResultList.map(({ id, match, score, terms }, index) => {
                const item = () => {
                  return id
                    .split(/\s/)
                    .map((word: string, wordIndex: number) => {
                      if (
                        terms.includes(word.replaceAll(/\W/g, '').toLowerCase())
                      ) {
                        return (
                          <span
                            key={wordIndex}
                            style={{ color: 'rgb(226, 68, 68)' }}
                          >
                            {word}{' '}
                          </span>
                        );
                      }
                      return <span key={wordIndex}>{word} </span>;
                    });
                };
                return (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      borderBottom: '1px solid #ddd',
                      padding: '5px',
                      cursor: 'pointer',
                    }}
                    tabIndex={0}
                    onKeyDown={() => {}}
                    onClick={() => {
                      flashCardKeyword$.next(id);
                    }}
                  >
                    {/* <div>{index}: </div> */}
                    <div>{item()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div
          style={{
            width: '70%',
            flexGrow: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              overflowY: 'hidden',
              overflowX: 'auto',
              minHeight: '30px',
            }}
            className="scrollbarHidden"
            onWheel={(e) => {
              const delta = Math.max(-1, Math.min(1, e.nativeEvent.wheelDelta));
              e.currentTarget.scrollLeft -= delta * 30;
              console.log('1111111');
            }}
          >
            {flashCards.map((card, index) => {
              const selected = card === currentCard;
              return (
                <div key={index}>
                  <Button
                    type="text"
                    style={{
                      color: selected ? '#138bff' : 'white',
                      background: selected ? 'rgb(72, 72, 72)' : 'none',
                      borderRadius: '5px 5px 0 0',
                    }}
                    onClick={() => {
                      setCurrentCard(card);
                    }}
                  >
                    {card.clean && '*'} {stringFolder(card.front.word, 10)}
                    {card.hasChanged && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          marginLeft: '6px',
                        }}
                      ></span>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
          {currentCard !== null && (
            <div
              style={{
                height: 'calc(100% - 30px)',
                width: '100%',
                overflowY: 'auto',
              }}
              onDrop={(e) => {
                const explain = e.dataTransfer.getData('explain');
                if (explain) {
                  const { def, examples } = JSON.parse(explain);
                  currentCard.back = `${def}\n- ${examples.join('\n- ')}`;
                  currentCard.clean = false;
                  currentCard.hasChanged = true;
                  setFlashCards([...flashCards]);
                }
                const sentence = e.dataTransfer.getData('sentence');
                console.log(`e.dataTransfer.getData('sentence'): ${sentence}`);
                if (sentence) {
                  currentCard.front.sentences.push(JSON.parse(sentence));
                  currentCard.clean = false;
                  currentCard.hasChanged = true;
                  setFlashCards([...flashCards]);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
            >
              <div
                style={{
                  minHeight: '50%',
                  backgroundColor: 'rgb(72, 72, 72)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '14px',
                  width: '100%',
                  overflowY: 'auto',
                }}
              >
                <div>?????????</div>
                <div style={{ flex: 1, width: '100%' }}>
                  {currentCard.front.sentences.length === 0 &&
                    currentCard.front.subtitles.length === 0 &&
                    (currentCard.front.pdfNote === undefined ||
                      currentCard.front.pdfNote.length === 0) && (
                      <>
                        <div>????????????????????????????????????????????????</div>
                      </>
                    )}
                  {currentCard.front.sentences.map((sentence, index) => {
                    return (
                      <div
                        key={sentence.content + index}
                        style={{ margin: '10px 10px', cursor: 'pointer' }}
                        tabIndex={0}
                        onClick={() => {
                          console.log('open sentence in flashCard:', sentence);
                          openSentence$.next(sentence);
                        }}
                        onKeyDown={(e) => {
                          if (e.key.toLowerCase() === 'enter') {
                            openSentence$.next(sentence);
                          }
                        }}
                      >
                        <LazyInput
                          value={stringFolder(sentence.content, 60)}
                          canEdit={false}
                          menu={[
                            [
                              {
                                onClick: () => {
                                  Modal.info({
                                    width: 800,
                                    title: '??????',
                                    content: (
                                      <pre>
                                        {JSON.stringify(sentence, null, 2)}
                                      </pre>
                                    ),
                                    onOk: () => {},
                                    onCancel: () => {},
                                  });
                                },
                                title: '??????',
                              },
                            ],
                            [
                              {
                                title: '????????????',
                                onClick: () => {
                                  remote.ipcMain.emit(
                                    'selectResource',
                                    'txt',
                                    PATH.join(dbRoot, 'resource')
                                  );
                                  remote.ipcMain.once(
                                    'onSelectResourceTxT',
                                    (data) => {
                                      console.log('onSelectResourceTxT:', data);
                                      const file = data as unknown as string;
                                      if (!file.startsWith(dbRoot)) {
                                        message.warn(
                                          '?????????Comma????????????????????????!'
                                        );
                                        return;
                                      }
                                      sentence.file = file.slice(dbRoot.length);
                                      // const updatedSentences =
                                      //   currentCard.front.sentences.filter(
                                      //     (s) => s !== sentence
                                      //   );
                                      const nextCard: FlashCard = {
                                        ...currentCard,
                                        hasChanged: true,
                                      };
                                      // currentCard.front.sentences =
                                      //   updatedSentences;
                                      const currentCardIndex =
                                        flashCards.findIndex(
                                          (f) => f === currentCard
                                        );
                                      const nextCards = [
                                        ...flashCards.slice(
                                          0,
                                          currentCardIndex
                                        ),
                                        nextCard,
                                        ...flashCards.slice(
                                          currentCardIndex + 1
                                        ),
                                      ];
                                      setFlashCards(nextCards);
                                      setCurrentCard(nextCard);
                                    }
                                  );
                                },
                              },
                              {
                                title: '??????',
                                onClick: () => {
                                  const updatedSentences =
                                    currentCard.front.sentences.filter(
                                      (s) => s !== sentence
                                    );
                                  const nextCard: FlashCard = {
                                    ...currentCard,
                                    hasChanged: true,
                                  };
                                  currentCard.front.sentences =
                                    updatedSentences;
                                  const currentCardIndex = flashCards.findIndex(
                                    (f) => f === currentCard
                                  );
                                  const nextCards = [
                                    ...flashCards.slice(0, currentCardIndex),
                                    nextCard,
                                    ...flashCards.slice(currentCardIndex + 1),
                                  ];
                                  setFlashCards(nextCards);
                                  setCurrentCard(nextCard);
                                },
                              },
                            ],
                          ]}
                        ></LazyInput>
                      </div>
                    );
                  })}
                  {currentCard.front.subtitles.map((subtitle, index) => {
                    const { subtitles, start, end, file } = subtitle;
                    const deleteSubtitle = () => {
                      const updatedSubtitles =
                        currentCard.front.subtitles.filter(
                          (sub) => subtitle !== sub
                        );
                      const nextCard: FlashCard = {
                        ...currentCard,
                        hasChanged: true,
                      };
                      nextCard.front.subtitles = updatedSubtitles;
                      const currentCardIndex = flashCards.findIndex(
                        (f) => f === currentCard
                      );
                      const nextCards = [
                        ...flashCards.slice(0, currentCardIndex),
                        nextCard,
                        ...flashCards.slice(currentCardIndex + 1),
                      ];
                      setFlashCards(nextCards);
                      setCurrentCard(nextCard);
                    };
                    return (
                      <div
                        key={index}
                        style={{ padding: '0 10px', cursor: 'pointer' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            width: '100%',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ margin: '0 14px' }}>-{index}.</div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              flexGrow: 1,
                              alignItems: 'center',
                            }}
                          >
                            <div
                              tabIndex={0}
                              onClick={() => {
                                playSubtitle$.next(subtitle);
                              }}
                              onKeyDown={(e) => {
                                if (e.key.toLowerCase() === 'enter') {
                                  playSubtitle$.next(subtitle);
                                }
                              }}
                            >
                              <PlayCircleOutlined></PlayCircleOutlined>
                            </div>

                            <div>
                              <div style={{ padding: '0 14px' }}>
                                {PATH.basename(file).replaceAll(/[^\w]/g, ' ')}
                              </div>
                              <div
                                style={{ display: 'flex', textAlign: 'center' }}
                              >
                                <LazyInput
                                  value={start}
                                  onChange={(value) => {}}
                                  displayValueTo={(value) =>
                                    millisecondsToTime(value)
                                  }
                                  canEdit={false}
                                ></LazyInput>
                                <div>???</div>
                                <LazyInput
                                  value={end}
                                  onChange={(value) => {}}
                                  displayValueTo={(value) =>
                                    millisecondsToTime(value)
                                  }
                                  canEdit={false}
                                ></LazyInput>
                              </div>
                            </div>
                            <div
                              tabIndex={0}
                              onClick={() => {
                                deleteSubtitle();
                              }}
                              onKeyDown={(e) => {
                                if (e.key.toLowerCase() === 'enter') {
                                  deleteSubtitle();
                                }
                              }}
                            >
                              <DeleteOutlined></DeleteOutlined>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(currentCard.front.pdfNote || []).map((pdfNote, index) => {
                    const { mergedStr } = pdfNote;
                    return (
                      <div
                        key={index}
                        tabIndex={0}
                        onClick={() => {
                          openNote$.next(pdfNote);
                          if (pdfNote.file) {
                            openPdf$.next(pdfNote.file);
                          }
                        }}
                        onKeyDown={() => {}}
                        style={{ cursor: 'pointer' }}
                      >
                        [pdf] {stringFolder(mergedStr, 60)}
                        <Popconfirm
                          title="??????"
                          onConfirm={() => {
                            const updatedPdfNote =
                              currentCard.front.pdfNote.filter(
                                (note) => pdfNote !== note
                              );
                            const nextCard: FlashCard = {
                              ...currentCard,
                              hasChanged: true,
                            };
                            nextCard.front.pdfNote = updatedPdfNote;
                            const currentCardIndex = flashCards.findIndex(
                              (f) => f === currentCard
                            );
                            const nextCards = [
                              ...flashCards.slice(0, currentCardIndex),
                              nextCard,
                              ...flashCards.slice(currentCardIndex + 1),
                            ];
                            setFlashCards(nextCards);
                            setCurrentCard(nextCard);
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-block',
                              cursor: 'pointer',
                              color: 'rgb(189, 79, 79)',
                            }}
                          >
                            <DeleteOutlined></DeleteOutlined>
                          </div>
                        </Popconfirm>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div
                style={{
                  minHeight: '50%',
                  backgroundColor: 'rgb(62, 62, 62)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '14px',
                }}
              >
                <div>?????????</div>
                <Input.TextArea
                  value={currentCard.back}
                  onChange={(e) => {
                    currentCard.back = e.target.value;
                    currentCard.clean = false;
                    currentCard.hasChanged = true;
                    setFlashCards([...flashCards]);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  placeholder="?????????????????????????????????????????????"
                  style={{
                    flexGrow: 1,
                    resize: 'none',
                    background: 'none',
                    color: 'white',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const FlashCardMaker = memo(Component);
