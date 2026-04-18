import mongoose from 'mongoose'

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
})

SettingSchema.statics.get = async function(key, defaultVal = null) {
  const doc = await this.findOne({ key }).lean()
  return doc ? doc.value : defaultVal
}

SettingSchema.statics.set = async function(key, value) {
  return this.findOneAndUpdate(
    { key },
    { key, value, updatedAt: new Date() },
    { upsert: true, new: true }
  )
}

export default mongoose.models.Setting || mongoose.model('Setting', SettingSchema)
