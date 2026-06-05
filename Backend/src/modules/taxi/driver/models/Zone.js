import mongoose from 'mongoose';

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    service_location_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiServiceLocation',
      default: null,
    },
    unit: {
      type: String,
      default: 'km',
      trim: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      default: 'active',
      trim: true,
    },
    geometry: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
  },
  { 
    timestamps: true,
  },
);

zoneSchema.index({ geometry: '2dsphere' });

export const Zone = mongoose.models.TaxiZone || mongoose.model('TaxiZone', zoneSchema, 'taxi_zones');
