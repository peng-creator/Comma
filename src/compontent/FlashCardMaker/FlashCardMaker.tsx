import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Input,
  message,
  Row,
  Select,
} from 'antd';
import {
  DeleteOutlined,
  EditFilled,
  PlayCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import PATH from 'path';
import { promises as fs } from 'fs';
import { v5 as uuidv5 } from 'uuid';
import { Subject } from 'rxjs';
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

const saveCard = async (cardToSave: FlashCard, cardIndexMap: CardIndexMap) => {
  // 加入到搜索库
  addSearchItems([
    {
      id: cardToSave.front.word,
    },
  ]);
  // 保存卡片。
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
      console.log('保存卡片失败:', e);
    });
};

export const addSubtitle$ = new Subject<Subtitle>();

const Component = () => {
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]); // 卡片集，一个卡片集存储关键词相同的卡片。
  const [currentCard, setCurrentCard] = useState<FlashCard | null>(null);
  const [cardCollections, setCardCollections] = useState<string[]>([]); // 全部卡片集
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
        console.log('加载全部卡片集失败！');
      });

    const sp = flashCardKeyword$.subscribe({
      next: async (keyword) => {
        // 使用miniSearch搜索
        const result = searchFlashCardCollections(keyword);
        console.log('keyword:', keyword, ' search card collections:', result);
        setSearchResultList(result);
        if (keyword === '') {
          return;
        }
        // 与现存卡片集匹配，然后打开。
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
        // 0.保存当前卡片集合。
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
          console.log('当前集合保存失败：', e);
        }
        // 1.打开卡片集合
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
        // 在卡片集后面加入新的卡片。
        addNewFlashCardToCollection();
      },
    });
    return () => sp.unsubscribe();
  }, []);

  useEffect(() => {
    const sp = addSubtitle$.subscribe({
      next(subtitle: Subtitle) {
        if (currentCard === null) {
          message.warn('没有打开的卡片');
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

  const cardCollectionSelector = (
    <Select
      style={{ width: '100%' }}
      showSearch
      placeholder="选择卡片集"
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
      <Empty description="没有卡片">您可以查询单词，然后在此制作卡片集</Empty>
    );
  }

  if (flashCards.length === 0 && cardCollections.length !== 0) {
    return cardCollectionSelector;
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
          搜索记录
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
              相关卡片集合：
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
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              overflowY: 'hidden',
              overflowX: 'auto',
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
              style={{ flexGrow: 1, width: '100%' }}
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
                  height: '50%',
                  backgroundColor: 'rgb(72, 72, 72)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '14px',
                  width: '100%',
                  overflowY: 'auto',
                }}
              >
                <div>摘抄：</div>
                <div style={{ flex: 1, width: '100%' }}>
                  {currentCard.front.sentences.length === 0 &&
                    currentCard.front.subtitles.length === 0 && (
                      <>
                        <div>您可以从文章中拖拽句子到这里进行摘抄。</div>
                        <div>或者在字幕列表里将字幕加入卡片。</div>
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
                        {sentence.content}
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
                                ></LazyInput>
                                <div>至</div>
                                <LazyInput
                                  value={end}
                                  onChange={(value) => {}}
                                  displayValueTo={(value) =>
                                    millisecondsToTime(value)
                                  }
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
                </div>
              </div>
              <div
                style={{
                  height: '50%',
                  backgroundColor: 'rgb(62, 62, 62)',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '14px',
                }}
              >
                <div>解释：</div>
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
                  placeholder="您可以从字典中拖拽释义到这里。"
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
