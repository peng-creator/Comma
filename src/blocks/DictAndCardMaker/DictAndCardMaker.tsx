import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Tabs } from 'antd';
import { BehaviorSubject, Subject } from 'rxjs';
import { bufferWhen, debounceTime, shareReplay } from 'rxjs/operators';
import { Dict } from '../../compontent/LeftPanel/Dict';
import { WordExplain } from '../../compontent/WordExplain/WordExplain';
import { FlashCardMaker } from '../../compontent/FlashCardMaker/FlashCardMaker';
import { flashCardKeyword$ } from '../../state/user_input/flashCardKeyword';

const { TabPane } = Tabs;

export const focusSearch$ = new Subject<void>();
export const tapWord$ = new Subject<string>();

const search$ = tapWord$.pipe(
  bufferWhen(() => tapWord$.pipe(debounceTime(1500))),
  shareReplay(1)
);

const Component = (
  { isDragging }: { isDragging: boolean } = { isDragging: false }
) => {
  const [inputSearchValue, setInputSearchValue] = useState('');
  const [searchContent, setSearchContent] = useState('');
  const [explains, setExplains] = useState<any[]>([]);
  const [searchBoxFocused, setSearchBoxFocused] = useState(false);
  const searchBoxRef: any = useRef<Input | null>();
  const [tabKey, setTabKey] = useState('collins');
  const [tapCache, setTapCache] = useState('');

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
            <TabPane tab="柯林斯" key="collins"></TabPane>
            <TabPane tab="有道" key="youdao"></TabPane>
          </Tabs>
          <div style={{ height: 'calc(100% - 120px)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                overflowY: 'auto',
                display: tabKey === 'collins' ? 'block' : 'none',
              }}
            >
              <WordExplain
                searchWord={searchContent}
                onGetExplains={(explains: any[]) => {
                  console.log('onGetExplains:', explains);
                  setExplains(explains);
                  if (explains.length === 0) {
                    setTabKey('youdao');
                  } else {
                    setTabKey('collins');
                  }
                }}
              ></WordExplain>
            </div>

            <Dict
              style={{
                display: tabKey === 'youdao' && !isDragging ? 'block' : 'none',
              }}
              searchWord={searchContent}
            ></Dict>
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
