import React from 'react';
import { Col, Row } from 'antd';
import { WordbookSelector } from './WordbookSelector';
import { AddWordbookComponent } from './AddWordbook';
import { WordsImportComponent } from './WordImport';
import { VideoImportComponent } from './VideoImport';

export const WordbookComponent = ({
  wordbook,
  wordbooks,
  setWordbook,
  selectWordsFromWordbook,
  setProgress,
  progress,
  setNewWordbookName,
  setWordbooks,
  newWordbookName,
  videoImportSubscription,
  setVideoImportSubscription,
}) => {
  return (
    <>
      <div className="wordbooks">
        <div>
          {wordbooks.length > 0 && (
            <Row>
              <Col span={24}>
                <WordbookSelector {...{ wordbook, wordbooks, setWordbook }} />
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
                  setWordbook,
                }}
              />
            </Col>
            <Col span={8}>
              <WordsImportComponent
                wordbook={wordbook}
                selectWordsFromWordbook={selectWordsFromWordbook}
              />
            </Col>
            <Col span={8}>
              <VideoImportComponent
                {...{
                  setProgress,
                  selectWordsFromWordbook,
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
