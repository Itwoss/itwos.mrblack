import React from 'react'
import { Modal, Button, Typography, Space, Divider, Tag } from 'antd'
import { CheckCircleOutlined, CreditCardOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

const PaymentConfirmationModal = ({ 
  visible, 
  onClose, 
  paymentData, 
  productTitle 
}) => {
  return (
    <Modal
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
          <span>Payment Confirmation</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Continue
        </Button>
      ]}
      width={500}
      centered
      maskClosable={false}
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <CheckCircleOutlined 
          style={{ 
            fontSize: '48px', 
            color: '#52c41a',
            marginBottom: '16px'
          }} 
        />
        
        <Title level={3} style={{ color: '#52c41a', marginBottom: '8px' }}>
          Payment Successful!
        </Title>
        
        <Paragraph style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
          Your payment has been processed successfully. Your prebook request is now under review.
        </Paragraph>
        
        <Divider />
        
        <div style={{ textAlign: 'left' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>Product:</Text>
              <br />
              <Text>{productTitle}</Text>
            </div>
            
            <div>
              <Text strong>Amount Paid:</Text>
              <br />
              <Text style={{ fontSize: '18px', color: '#52c41a' }}>
                ₹{paymentData?.amount ? (paymentData.amount / 100).toFixed(2) : '1.00'}
              </Text>
            </div>
            
            <div>
              <Text strong>Payment ID:</Text>
              <br />
              <Text code style={{ fontSize: '12px' }}>
                {paymentData?.paymentId || 'Processing...'}
              </Text>
            </div>
            
            <div>
              <Text strong>Status:</Text>
              <br />
              <Tag color="green">Completed</Tag>
            </div>
          </Space>
        </div>
        
        <Divider />
        
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size="small">
            <Text type="secondary" style={{ fontSize: '14px' }}>
              <CreditCardOutlined /> Your payment is secure and encrypted
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              You will be redirected to view your prebook details
            </Text>
          </Space>
        </div>
      </div>
    </Modal>
  )
}

export default PaymentConfirmationModal

