import { BookOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { Button, Drawer } from 'antd';
import React, { memo, useEffect, useState } from 'react';
import { shell } from 'electron';
import PATH from 'path';
import { Article } from '../article/Article';
import { ArticleLoader } from '../ArticleLoader/ArticleLoader';
import { dbRoot } from '../../database/db';
import { mkdir } from '../../util/mkdir';

const L1 = PATH.join(dbRoot, 'reading');
mkdir(L1);

const Component = () => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      style={{
        marginTop: '22px',
        display: 'flex',
        height: 'calc(100% - 22px)',
        backgroundColor: '#fff',
        position: 'relative',
      }}
    >
      <Article></Article>
      <Drawer
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>资源</div>
            <Button
              type="text"
              onClick={() => {
                shell.showItemInFolder(L1);
              }}
            >
              <FolderOpenOutlined />
            </Button>
          </div>
        }
        placement="right"
        onClose={() => {
          setVisible(false);
        }}
        getContainer={false}
        visible={visible}
        style={{ position: 'absolute' }}
      >
        <ArticleLoader onOpenArticle={() => setVisible(false)}></ArticleLoader>
      </Drawer>
      <Button
        style={{ position: 'absolute', right: '14px', top: '14px' }}
        onClick={() => {
          setVisible(true);
        }}
      >
        <FolderOpenOutlined />
      </Button>
    </div>
  );
};
export const Reading = memo(Component);
