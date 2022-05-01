import React, { useState, useEffect, useRef, memo } from 'react';
import {
  Button,
  Col,
  Empty,
  Input,
  message,
  Popconfirm,
  Row,
  Tabs,
} from 'antd';
import { BehaviorSubject, Subject } from 'rxjs';
import { bufferWhen, debounceTime, shareReplay } from 'rxjs/operators';
import { Dict } from '../../compontent/Dict/Dict';
import { FlashCardMaker } from '../../compontent/FlashCardMaker/FlashCardMaker';
import { flashCardKeyword$ } from '../../state/user_input/flashCardKeyword';
import { useBehavior } from '../../state';
import {
  addEngine,
  engineList$,
  removeEngine,
} from '../../searchEngine/searchEngine';
import { SettingOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

export const focusSearch$ = new Subject<void>();
export const tapWord$ = new Subject<string>();

export const searchSentence = (s: string) => {
  s.split(/\s/).forEach((w) => {
    tapWord$.next(w);
  });
};

const search$ = tapWord$.pipe(
  bufferWhen(() => tapWord$.pipe(debounceTime(1500))),
  shareReplay(1)
);

export const isDragging$ = new BehaviorSubject(false);

const Component = () => {
  const [inputSearchValue, setInputSearchValue] = useState('');
  const [searchContent, setSearchContent] = useState('');
  const [searchBoxFocused, setSearchBoxFocused] = useState(false);
  const searchBoxRef: any = useRef<Input | null>();
  const [tabKey, setTabKey] = useState('有道');
  const [tapCache, setTapCache] = useState('');
  const [isDragging] = useBehavior(isDragging$, false);
  const [engineList] = useBehavior(engineList$, []);
  const [addDictTitle, setAddDictTitle] = useState('');
  const [addDictAddress, setAddDictAddress] = useState('');

  const search = (content: string) => {
    setInputSearchValue(content);
    setSearchContent(content);
    flashCardKeyword$.next(content);
  };

  useEffect(() => {
    let tapCache = [] as string[];
    tapWord$.subscribe({
      next(word) {
        tapCache.push(word);
        setTapCache(tapCache.join(' '));
      },
    });
    const sp = search$.subscribe({
      next(searchWords) {
        console.log('searchWords:', searchWords);
        tapCache = [];
        setTapCache('');
        if (searchWords.length === 1) {
          search(searchWords[0].replace(/[^a-zA-Z-]/g, ''));
        } else {
          search(searchWords.join(' '));
        }
      },
    });
    return () => sp.unsubscribe();
  }, []);

  useEffect(() => {
    const sp = focusSearch$.subscribe({
      next() {
        if (searchBoxFocused) {
          return;
        }
        if (searchBoxRef.current !== null) {
          setTimeout(() => {
            searchBoxRef.current.focus();
            setSearchBoxFocused(true);
            setInputSearchValue('');
          });
        }
      },
    });
    return () => sp.unsubscribe();
  }, [searchBoxFocused, searchBoxRef.current]);

  const currentEngine = engineList.find(({ title }) => title === tabKey);

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
      {tapCache && (
        <div
          style={{
            position: 'absolute',
            height: '100%',
            top: 0,
            left: 0,
            width: '100%',
            justifyContent: 'center',
            zIndex: 1,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 30,
              textAlign: 'center',
              color: 'rgb(223, 182, 18)',
              backgroundColor: '#000',
              width: '100%',
            }}
          >
            <span>{tapCache}</span>
          </div>
        </div>
      )}
      <div style={{ fontSize: '24px', marginBottom: '14px' }}>
        <Input
          ref={searchBoxRef}
          type="text"
          value={inputSearchValue}
          onChange={(e) => {
            setInputSearchValue(e.target.value);
          }}
          style={{
            backgroundColor: 'rgb(30, 30, 35)',
            color: 'rgb(100, 100, 100)',
          }}
          onFocus={() => {
            console.log('setSearchBoxFocused true');
            setSearchBoxFocused(true);
          }}
          onKeyDown={(e) => {
            const key = e.key.toLowerCase();
            if (key === 'escape'.toLowerCase()) {
              searchBoxRef.current.blur();
              setSearchBoxFocused(false);
            } else if (key === 'enter'.toLowerCase()) {
              search(inputSearchValue);
              searchBoxRef.current.blur();
            }
          }}
          onBlur={() => {
            setSearchBoxFocused(false);
          }}
          placeholder="查询词典"
        />
      </div>
      <div
        style={{
          display: 'flex',
          flexGrow: 1,
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '50%',
            flexGrow: 1,
          }}
          onDrop={(e) => {
            console.log('onDrop setIsDragging(false)');
            const sentence = e.dataTransfer.getData('search');
            if (sentence) {
              search(sentence);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
        >
          {isDragging && (
            <div
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.8)',
                zIndex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#000',
                fontSize: '30px',
              }}
            >
              拖放到此处翻译
            </div>
          )}
          <Tabs
            activeKey={tabKey}
            style={{ color: 'white' }}
            onChange={(key) => setTabKey(key)}
          >
            <TabPane tab="隐藏词典" key="none"></TabPane>
            {engineList.map(({ title }) => {
              return <TabPane tab={title} key={title}></TabPane>;
            })}
            <TabPane
              tab={
                <SettingOutlined
                  style={{ position: 'relative', left: '6px' }}
                ></SettingOutlined>
              }
              key="addDict"
            ></TabPane>
          </Tabs>
          <div style={{ height: 'calc(100% - 72px)', overflow: 'hidden' }}>
            {currentEngine && (
              <Dict
                style={{
                  display: !isDragging ? 'block' : 'none',
                }}
                searchWord={searchContent}
                address={currentEngine.pattern}
              ></Dict>
            )}
            {tabKey === 'addDict' && (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Row>
                  <Col span={3}>标题:</Col>
                  <Col span={21}>
                    <Input
                      value={addDictTitle}
                      onChange={(e) => {
                        setAddDictTitle(e.target.value);
                      }}
                      placeholder="请输入词典名称"
                    ></Input>
                  </Col>
                </Row>
                <Row style={{ margin: '12px 0' }}>
                  <Col span={3}>搜索地址:</Col>
                  <Col span={21}>
                    <Input
                      placeholder="请使用 {} 作为关键词占位符"
                      value={addDictAddress}
                      onChange={(e) => setAddDictAddress(e.target.value)}
                    ></Input>
                  </Col>
                </Row>
                <Row>
                  <Col span={3}></Col>
                  <Col span={5}>
                    <Button
                      onClick={() => {
                        if (!addDictTitle || !addDictAddress) {
                          message.error('请输入完整!');
                          return;
                        }
                        addEngine({
                          title: addDictTitle,
                          pattern: addDictAddress,
                        });
                        setAddDictAddress('');
                        setAddDictTitle('');
                      }}
                    >
                      保存
                    </Button>
                  </Col>
                </Row>
                <div style={{ margin: '14px 0' }}>管理词典</div>
                {engineList.length === 0 && <Empty description="没有词典" />}
                <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                  {engineList.map(({ title, pattern }) => {
                    return (
                      <Row key={title}>
                        <Col span={4}>{title}</Col>
                        <Col span={16}>{pattern}</Col>
                        <Col span={4}>
                          <Popconfirm
                            title="删除"
                            onConfirm={() => {
                              removeEngine(title);
                            }}
                          >
                            <Button type="text" style={{ color: 'red' }}>
                              删除
                            </Button>
                          </Popconfirm>
                        </Col>
                      </Row>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ flexGrow: 1, height: '50%' }}>
          <FlashCardMaker></FlashCardMaker>
        </div>
      </div>
    </div>
  );
};
export const DictAndCardMaker = memo(Component);
