import mongoose from 'mongoose';

const weightRangeSchema = new mongoose.Schema(
  {
    weight_range: {
      type: String,
      required: true,
      trim: true,
    },
    base_price: {
      type: Number,
      required: true,
    },
    base_distance: {
      type: Number,
      required: true,
    },
    price_per_distance: {
      type: Number,
      required: true,
    },
    active: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      default: 'active',
      trim: true,
    },
  },
  { timestamps: true }
);

weightRangeSchema.index({ weight_range: 1, status: 1 });

export const WeightRange = mongoose.models.TaxiWeightRange || mongoose.model('TaxiWeightRange', weightRangeSchema, 'taxi_weightranges');
