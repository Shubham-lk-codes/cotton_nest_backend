const Joi = require('joi');

/**
 * Validation middleware for creating orders
 */
const validateOrderCreation = (req, res, next) => {
  const schema = Joi.object({
    amount: Joi.number()
      .positive()
      .required()
      .messages({
        'number.base': 'Amount must be a number',
        'number.positive': 'Amount must be positive',
        'any.required': 'Amount is required'
      }),
    
    currency: Joi.string()
      .valid('INR')
      .default('INR')
      .messages({
        'any.only': 'Currency must be INR'
      }),
    
    items: Joi.array()
      .min(1)
      .required()
      .items(
        Joi.object({
          productId: Joi.string()
            .required()
            .messages({
              'string.empty': 'Product ID is required',
              'any.required': 'Product ID is required'
            }),
          name: Joi.string()
            .required()
            .messages({
              'string.empty': 'Product name is required',
              'any.required': 'Product name is required'
            }),
          color: Joi.string()
            .required()
            .messages({
              'string.empty': 'Color is required',
              'any.required': 'Color is required'
            }),
          size: Joi.string()
            .required()
            .messages({
              'string.empty': 'Size is required',
              'any.required': 'Size is required'
            }),
          quantity: Joi.number()
            .integer()
            .positive()
            .required()
            .messages({
              'number.base': 'Quantity must be a number',
              'number.integer': 'Quantity must be an integer',
              'number.positive': 'Quantity must be positive',
              'any.required': 'Quantity is required'
            }),
          price: Joi.number()
            .positive()
            .required()
            .messages({
              'number.base': 'Price must be a number',
              'number.positive': 'Price must be positive',
              'any.required': 'Price is required'
            }),
          image: Joi.string()
            .optional()
        })
      )
      .messages({
        'array.min': 'At least one item is required',
        'any.required': 'Items are required'
      }),
    
    userDetails: Joi.object({
      name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
          'string.empty': 'Name is required',
          'string.min': 'Name must be at least 2 characters',
          'string.max': 'Name cannot exceed 100 characters',
          'any.required': 'Name is required'
        }),
      
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Please provide a valid email address',
          'string.empty': 'Email is required',
          'any.required': 'Email is required'
        }),
      
      phone: Joi.string()
        .pattern(/^[6-9]\d{9}$/)
        .required()
        .messages({
          'string.pattern.base': 'Please provide a valid 10-digit Indian phone number',
          'string.empty': 'Phone number is required',
          'any.required': 'Phone number is required'
        }),
      
      address: Joi.object({
        street: Joi.string()
          .trim()
          .min(5)
          .max(200)
          .required()
          .messages({
            'string.empty': 'Street address is required',
            'string.min': 'Street address must be at least 5 characters',
            'string.max': 'Street address cannot exceed 200 characters',
            'any.required': 'Street address is required'
          }),
        
        city: Joi.string()
          .trim()
          .min(2)
          .max(50)
          .required()
          .messages({
            'string.empty': 'City is required',
            'string.min': 'City must be at least 2 characters',
            'string.max': 'City cannot exceed 50 characters',
            'any.required': 'City is required'
          }),
        
        state: Joi.string()
          .trim()
          .min(2)
          .max(50)
          .required()
          .messages({
            'string.empty': 'State is required',
            'string.min': 'State must be at least 2 characters',
            'string.max': 'State cannot exceed 50 characters',
            'any.required': 'State is required'
          }),
        
        country: Joi.string()
          .trim()
          .default('India'),
        
        pincode: Joi.string()
          .pattern(/^\d{6}$/)
          .required()
          .messages({
            'string.pattern.base': 'Please provide a valid 6-digit pincode',
            'string.empty': 'Pincode is required',
            'any.required': 'Pincode is required'
          }),
        
        landmark: Joi.string()
          .trim()
          .optional()
      })
      .required()
      .messages({
        'any.required': 'Address details are required'
      })
    })
    .required()
    .messages({
      'any.required': 'User details are required'
    })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validation middleware for payment verification
 */
const validatePaymentVerification = (req, res, next) => {
  const schema = Joi.object({
    razorpay_order_id: Joi.string()
      .required()
      .messages({
        'string.empty': 'Razorpay order ID is required',
        'any.required': 'Razorpay order ID is required'
      }),
    
    razorpay_payment_id: Joi.string()
      .required()
      .messages({
        'string.empty': 'Razorpay payment ID is required',
        'any.required': 'Razorpay payment ID is required'
      }),
    
    razorpay_signature: Joi.string()
      .required()
      .messages({
        'string.empty': 'Razorpay signature is required',
        'any.required': 'Razorpay signature is required'
      })
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: error.details[0].message
    });
  }

  next();
};

/**
 * Validation middleware for updating order status
 */
const validateOrderStatusUpdate = (req, res, next) => {
  const { ORDER_STATUS } = require('../config/constants');
  
  const schema = Joi.object({
    status: Joi.string()
      .valid(...Object.values(ORDER_STATUS))
      .required()
      .messages({
        'any.only': `Status must be one of: ${Object.values(ORDER_STATUS).join(', ')}`,
        'any.required': 'Status is required'
      }),
    
    notes: Joi.string()
      .optional()
      .max(500)
      .messages({
        'string.max': 'Notes cannot exceed 500 characters'
      }),
    
    trackingNumber: Joi.string()
      .optional()
      .when('status', {
        is: ORDER_STATUS.SHIPPED,
        then: Joi.string().required().messages({
          'any.required': 'Tracking number is required when status is shipped'
        })
      }),
    
    carrier: Joi.string()
      .optional()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: error.details[0].message
    });
  }

  next();
};

module.exports = {
  validateOrderCreation,
  validatePaymentVerification,
  validateOrderStatusUpdate
};