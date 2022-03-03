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
import { EditFilled, SaveOutlined } from '@ant-design/icons';
import PATH from 'path';
import { promises as fs } from 'fs';
import { v5 as uuidv5 } from 'uuid';
import { flashCardKeyword$ } from '../../state/user_input/flashCardKeyword';
import { FlashCard } from '../../types/FlashCard';
import { openSentence$ } from '../../state/user_input/openSentenceAction';
import { dbRoot } from '../../constant';
import { mkdir } from '../../util/mkdir';
import { stringFolder } from '../../util/string_util';

const { Option } = Select;

const MY_NAMESPACE = '2a671a64-40d5-491e-99b0-da01ff1f3341';
const CARD_COLLECTION_NAMESPACE = '3b671a64-40d5-491e-99b0-da01ff1f3341';

const newFlashCard = (keyword: string): FlashCard => {
  return {
    id: uuidv5(keyword + Date.now(), MY_NAMESPACE),
    front: {
      word: keyword,
      clips: [],
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
  if (cardToSave.clean) {
    throw new Error('无法保存空白卡片!');
  }
  if (!cardToSave.hasChanged) {
    return;
  }
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

const Component = () => {
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]); // 卡片集，一个卡片集存储关键词相同的卡片。
  const [currentCard, setCurrentCard] = useState<FlashCard | null>(null);
  const [cardCollections, setCardCollections] = useState<string[]>([]); // 全部卡片集
  const [currentCollection, setCurrentCollection] = useState('');
  const [cardIndexMapCache, setCardIndexMapCache] = useState<CardIndexMap>({});

  useEffect(() => {
    let lastKeyword = '';
    let cacheFlashCards: FlashCard[] = [];
    let cardCollections: string[] = [];
    let cardIndexMapCache: CardIndexMap = {};

    cardIndexMapPromise
      .then((cardIndexMap: { [prop: string]: string }) => {
        cardIndexMapCache = cardIndexMap;
        setCardIndexMapCache(cardIndexMapCache);
        const collectionKeywordList = [...new Set(Object.values(cardIndexMap))];
        setCardCollections(collectionKeywordList);
        cardCollections = collectionKeywordList;
      })
      .catch((e) => {
        console.log('加载全部卡片集失败！');
      });

    const sp = flashCardKeyword$.subscribe({
      next: async (keyword) => {
        if (keyword === '') {
          return;
        }
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
            return bufs.map((buf) => JSON.parse(buf.toString()) as FlashCard);
          })
          .catch((e) => {
            return [];
          });
        console.log('loadedFlashCards:', loadedFlashCards);
        nextFlashCards = loadedFlashCards || [];
        // 在卡片集后面加入新的卡片。
        addNewFlashCardToCollection();
      },
    });
    return () => sp.unsubscribe();
  }, []);

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
      }}
    >
      <div style={{ marginTop: '10px', marginBottom: '10px' }}>
        <Row>
          <Col span={3}>
            {currentCard !== null && (
              <Button
                type="ghost"
                style={{ color: 'white' }}
                onClick={() => {
                  saveCard(currentCard, cardIndexMapCache)
                    .then(() => setFlashCards([...flashCards]))
                    .catch((e) => message.error(e.message));
                }}
              >
                <SaveOutlined />
              </Button>
            )}
          </Col>
          <Col span={10}>{cardCollectionSelector}</Col>
        </Row>
      </div>
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
          style={{ height: '100%' }}
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
          <div style={{ height: '50%', backgroundColor: 'rgb(72, 72, 72)' }}>
            <div>正面</div>
            <div>{currentCard.front.word}</div>
            {currentCard.front.sentences.length === 0 && (
              <div>您可以从右侧文章中拖拽句子到这里进行摘抄。</div>
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
          </div>
          <div
            style={{
              height: '50%',
              backgroundColor: 'rgb(62, 62, 62)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div>背面</div>
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
  );
};

export const FlashCardMaker = memo(Component);
