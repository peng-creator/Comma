import React from 'react';
import { Col, Popconfirm, Progress, Row } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';

export const VideoImportProgressComponent = ({
  progress,
  onCancel,
  style = {},
}) => {
  if (progress === null) {
    return null;
  }
  return (
    <div
      style={{
        height: progress === null ? 0 : 'auto',
        padding: '5px',
        textAlign: 'center',
        ...style,
      }}
      className="importProgress"
    >
      {progress.isLoading && <span>载入视频中...</span>}
      {progress.isLoading === undefined && (
        <>
          <Row>
            <Col span={5} style={{ textAlign: 'center' }}>
              导入进度
            </Col>
            <Col span={16} style={{ padding: '0 5px' }}>
              <Progress percent={progress.percent} showInfo={false} />
            </Col>
            <Col
              span={3}
              style={{ textAlign: 'center', cursor: 'pointer' }}
              className="del-btn"
            >
              <Popconfirm
                placement="bottom"
                title="确定要结束当前任务？"
                onConfirm={onCancel}
                okText="确认"
                cancelText="取消"
              >
                <div style={{ width: '100%', height: '100%' }}>
                  <CloseCircleOutlined />
                </div>
              </Popconfirm>
            </Col>
          </Row>
          <Row>
            {progress.timeRemain && (
              <Col span={24} style={{ textAlign: 'center' }}>
                {progress.timeRemain}
              </Col>
            )}
          </Row>
        </>
      )}
    </div>
  );
};
