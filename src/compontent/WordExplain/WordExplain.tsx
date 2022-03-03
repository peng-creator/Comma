import React, { useEffect, useState } from 'react';
import { Card, Collapse, Empty } from 'antd';
import { collins } from '../../util/collins';

const { Panel } = Collapse;

export const WordExplain = ({
  searchWord,
  onGetExplains,
  onExplainDragEnd,
  onExplainDragStart,
}: any) => {
  const [explains, setExplains] = useState([] as any[]);

  useEffect(() => {
    (async () => {
      let w = searchWord.replace(/[^a-zA-Z'-\s]+/g, '');
      try {
        console.log('queryLocalDict word:', w);
        // const explainsThesaurusy = macmillanThesaurusy(w);
        const explainsCollins = await collins(w);
        // const explainsOald = oald(w);
        const explains = [
          // ...explainsThesaurusy,
          ...explainsCollins,
          // ...explainsOald,
        ];
        onGetExplains(explains);
        setExplains(explains);
      } catch (err) {
        console.log('queryLocalDict err:', err);
        onGetExplains([]);
        setExplains([]);
      }
    })();
  }, [searchWord]);

  if (explains.length === 0) {
    return <Empty></Empty>;
  }

  return (
    <Collapse
      style={{ background: 'none', border: 'none' }}
      className="word-explain"
    >
      {explains.map((e: any, i: any) => {
        return (
          <Panel
            header={
              <div
                draggable
                onDragEnd={() => {
                  onExplainDragEnd();
                }}
                onDragStart={(ev) => {
                  onExplainDragStart();
                  ev.dataTransfer.setData('explain', JSON.stringify(e));
                }}
              >
                {e.def}
              </div>
            }
            key={`${e.def}_${i}`}
          >
            {e.examples.map((example: any, i: any) => (
              <div key={`${example}_${i}`}>- {example}</div>
            ))}
            {e.examples.length === 0 && <div>- 无示例 </div>}
          </Panel>
        );
      })}
    </Collapse>
  );
};

WordExplain.defaultProps = {
  onExplainDragEnd: () => {},
  onExplainDragStart: () => {},
};
