import { Row, Col } from 'antd';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { VanillaCard } from '../../compontent/VanillaCard/VanillaCard';

export const Home = () => {
  return (
    <div
      style={{
        marginTop: '22px',
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '20px',
      }}
    >
      <div>
        <Row>
          <Col>
            <Link style={{ display: 'block' }} to="/episode">
              <VanillaCard style={{ color: 'white' }}>
                <div>逐句观影</div>
              </VanillaCard>
            </Link>
          </Col>
          <Col>
            <Link style={{ display: 'block' }} to="/word">
              <VanillaCard style={{ color: 'white' }}>
                <div>单词短语</div>
              </VanillaCard>
            </Link>
          </Col>
        </Row>
        <Row>
          <Col>
            <Link style={{ display: 'block' }} to="/reading">
              <VanillaCard style={{ color: 'white' }}>
                <div>阅读模式</div>
              </VanillaCard>
            </Link>
          </Col>
          <Col>
            <Link style={{ display: 'block' }} to="/vocabularytest">
              <VanillaCard style={{ color: 'white' }}>
                <div>词汇量测试</div>
              </VanillaCard>
            </Link>
          </Col>
        </Row>
      </div>
    </div>
  );
};
