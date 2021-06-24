import React from 'react';
import { Col, Row } from 'antd';
import { WordbookSelector } from './WordbookSelector';
import { AddWordbookComponent } from './AddWordbook';
import { WordsImportComponent } from './WordImport';
import { VideoImportComponent } from './VideoImport';

export const WordbookComponent = ({
  wordbook,
  wordbooks,
  onWordbookChange,
  setProgress,
  progress,
  setNewWordbookName,
  setWordbooks,
  newWordbookName,
  videoImportSubscription,
  setVideoImportSubscription,
  onNewWordsImported,
  onWordbookSelected,
}) => {
  let nameToWordbook = {};
  for (let wb of wordbooks) {
    if (nameToWordbook[wb.name] === undefined) {
      nameToWordbook[wb.name] = wb;
    }
  }
  wordbooks = Object.values(nameToWordbook);
  return (
    <>
      <div className="wordbooks">
        <div>
          {wordbooks.length > 0 && (
            <Row>
              <Col span={24}>
                <WordbookSelector
                  {...{ wordbook, wordbooks, onWordbookSelected }}
                />
              </Col>
            </Row>
          )}
          <Row>
            <Col span={8}>
              <AddWordbookComponent
                {...{
                  wordbooks,
                  setNewWordbookName,
                  setWordbooks,
                  newWordbookName,
                  onWordbookChange,
                }}
              />
            </Col>
            <Col span={8}>
              <WordsImportComponent
                wordbook={wordbook}
                onNewWordsImported={onNewWordsImported}
              />
            </Col>
            <Col span={8}>
              <VideoImportComponent
                {...{
                  setProgress,
                  onWordbookChange,
                  wordbook,
                  progress,
                  videoImportSubscription,
                  setVideoImportSubscription,
                }}
              />
            </Col>
          </Row>
        </div>
      </div>
    </>
  );
};
