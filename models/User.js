const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },
  avatar: {
    type: String,
    default: 'https://api.dicebear.com/7.x/avataaars/svg',
  },
  role: {
    type: String,
    required: [true, 'Please add a role'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Away', 'Inactive'],
    default: 'Active',
  },
  statusColor: {
    type: String,
    default: '#10B981',
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    desktopNotifications: {
      type: Boolean,
      default: true,
    },
    themeMode: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    accentColor: {
      type: String,
      default: '#3b82f6',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtuals
UserSchema.virtual('initials').get(function () {
  return this.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
});

// Automatically set statusColor based on status
UserSchema.pre('save', function (next) {
  const statusColorMap = {
    Active: '#10B981',
    Away: '#FBBF24',
    Inactive: '#6B7280',
  };
  this.statusColor = statusColorMap[this.status] || '#10B981';
  next();
});

// Transform output
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

// Encrypt password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) next();
  const salt = await bcrypt.genSalt(config.saltRounds);
  this.password = await bcrypt.hash(this.password, salt);
});

// JWT Token
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
};

// Match password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
