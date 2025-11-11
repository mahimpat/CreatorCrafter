# AI Audio Generation Options - Commercial License Research

**Date:** November 6, 2025
**Purpose:** Find commercial-license alternatives to AudioCraft for CreatorCrafter

---

## ❌ Current Problem: AudioCraft

- **License:** CC-BY-NC 4.0 (Non-Commercial)
- **Issue:** Cannot be used in commercial CreatorCrafter installations
- **Impact:** Legal liability for commercial users

---

## ✅ Commercial-Friendly Solutions

### 1. **ElevenLabs Sound Effects API** ⭐ RECOMMENDED

**Type:** Cloud API (Text-to-Sound)

**Licensing:**
- ✅ **Commercial license included** with paid plans
- ✅ Royalty-free for YouTube, social media, advertising
- ✅ Cannot resell the tool itself (fine for our use case)

**Pricing:**
- **Free Tier:** Requires attribution, NO commercial use
- **Starter:** $5/month - 30k credits + commercial license
- **Creator:** $11/month - 100k credits + commercial license
- **Pro:** $99/month - 500k credits
- **Scale:** $330/month - 2M credits + priority support

**Cost Per Generation:**
- 200 credits per AI-decided duration (~$0.03)
- 40 credits per second if user sets duration (~$0.006/sec)
- Max 30 seconds per generation

**Capabilities:**
- ✅ Foley effects (footsteps, glass breaking, etc.)
- ✅ Ambient sounds
- ✅ SFX with natural timing/dynamics
- ✅ 4 variations per generation
- ✅ High quality output

**API:** Yes, RESTful API with good documentation

**Best For:** Small to medium creators, predictable monthly costs

---

### 2. **Stability AI - Stable Audio 2.5**

**Type:** Cloud API or Self-Hosted (Text-to-Audio, Audio-to-Audio)

**Licensing:**
- ✅ **Community License:** Free for orgs <$1M annual revenue
- ✅ **Enterprise License:** Required for >$1M revenue
- ✅ Trained on fully licensed datasets
- ✅ Commercially safe output

**Pricing:**
- **Community:** FREE (if revenue <$1M/year)
- **Enterprise:** Contact sales (custom pricing)
- **API Access:** Available through Stability AI, fal, Replicate, ComfyUI

**Performance:**
- ⚡ <2 seconds inference on GPU
- 🎵 Up to 3 minutes per generation
- 🎯 Studio-quality output

**Capabilities:**
- ✅ Music generation (full tracks)
- ✅ Sound effects
- ✅ Audio-to-audio (style transfer)
- ✅ Audio inpainting
- ✅ Multi-modal workflows

**API:** Yes, official API + partner integrations

**Best For:** Startups under $1M revenue (FREE!), enterprises needing customization

---

### 3. **Replicate API** (Host Multiple Models)

**Type:** Model hosting platform

**Licensing:**
- ⚠️ Varies by model - check each model's license
- ✅ Platform supports commercial use
- ✅ Clear licensing info per model

**Pricing:**
- Pay-as-you-go (per second of compute)
- **Meta MusicGen:** $0.064 per run
- **Kokoro 82M:** $0.00022 per run
- **PlayHT PlayDialog:** $0.001 per second
- Free tier available for testing

**Capabilities:**
- ✅ Multiple audio models available
- ✅ Music generation
- ✅ Speech synthesis
- ✅ SFX (depending on model)

**API:** Yes, unified API for all models

**Best For:** Developers wanting flexibility, pay-per-use model

---

### 4. **SFX Engine**

**Type:** SaaS Platform with API

**Licensing:**
- ✅ **100% royalty-free commercial license** on all generations
- ✅ No additional fees or royalties

**Pricing:**
- Tiered plans with API access
- Specific pricing not disclosed (contact sales)

**Capabilities:**
- ✅ Studio-quality SFX
- ✅ Background music generation
- ✅ API access for developers
- ✅ Priority support

**API:** Yes, available in paid tiers

**Best For:** Users wanting simple, clear licensing

---

### 5. **Stable Audio Open** (Self-Hosted)

**Type:** Open Source Model (Self-Hosted)

**Licensing:**
- ✅ Open source (Stability AI Community License)
- ✅ Commercial use allowed if revenue <$1M
- ✅ Can fine-tune on custom data

**Pricing:**
- FREE (open source)
- Requires GPU to run (AWS EC2 g4dn: ~$0.50/hour)

**Capabilities:**
- ✅ Up to 47 seconds per generation
- ✅ Drum beats, instrument riffs
- ✅ Ambient sounds
- ✅ Foley and production elements
- ✅ Fine-tunable on custom audio data

**API:** Self-hosted, need to build API wrapper

**Best For:** Technical users, startups wanting to self-host

---

### 6. **Adobe Firefly Sound Generator** (Future)

**Type:** Cloud API (Coming Soon)

**Licensing:**
- Expected to have commercial license
- Part of Adobe Creative Cloud ecosystem

**Status:** Announced but not yet fully available (as of Nov 2025)

**Capabilities:**
- Text + vocal performance → SFX
- Matches timing and dynamics
- Adobe ecosystem integration

**Best For:** Adobe Creative Cloud subscribers (when available)

---

## 📊 Comparison Matrix

| Solution | Commercial License | Pricing Model | Cost Per Gen | Self-Host | Quality | Integration Effort |
|----------|-------------------|---------------|--------------|-----------|---------|-------------------|
| **ElevenLabs** | ✅ ($5+/mo) | Subscription | $0.03-0.20 | ❌ | ⭐⭐⭐⭐⭐ | Easy (REST API) |
| **Stable Audio 2.5** | ✅ (FREE <$1M) | Free/Enterprise | Varies | ❌/✅ | ⭐⭐⭐⭐⭐ | Easy (API) |
| **Replicate** | ✅ (varies) | Pay-per-use | $0.001-0.064 | ❌ | ⭐⭐⭐⭐ | Easy (API) |
| **SFX Engine** | ✅ | Subscription | Unknown | ❌ | ⭐⭐⭐⭐ | Medium (API) |
| **Stable Audio Open** | ✅ (<$1M) | FREE | $0 (+ hosting) | ✅ | ⭐⭐⭐⭐ | Hard (DIY) |
| **AudioCraft** | ❌ (NC only) | FREE | $0 (+ hosting) | ✅ | ⭐⭐⭐⭐ | Already done |

---

## 🎯 Recommendations

### For CreatorCrafter MVP (Immediate)

**Option 1: Hybrid Approach** ⭐ BEST
```
✅ Keep AudioCraft with "Non-Commercial Only" warning
✅ Add ElevenLabs for commercial users
✅ Let users choose in Settings
```

**Why:**
- Fastest to implement (ElevenLabs API is simple)
- Covers both use cases
- Users self-select based on needs
- Clear legal protection

**Implementation:**
```typescript
enum SFXProvider {
  AUDIOCRAFT = 'audiocraft',     // Free, local, non-commercial
  ELEVENLABS = 'elevenlabs',     // Paid, cloud, commercial
  FREESOUND = 'freesound'        // Library only
}

// Require user to acknowledge license restrictions
if (provider === 'audiocraft') {
  showWarning('AudioCraft is for non-commercial use only...')
}
```

---

### For CreatorCrafter v1.1 (3-6 months)

**Option 2: Full Stable Audio Integration**
```
✅ Migrate to Stable Audio 2.5 API
✅ Use Community License (free <$1M)
✅ Add Enterprise License for bigger customers
✅ Remove AudioCraft dependency
```

**Why:**
- FREE for most users (startups <$1M revenue)
- Higher quality than AudioCraft
- Faster inference (<2 seconds)
- Fully commercial-safe
- Can upsell Enterprise License

---

### For CreatorCrafter v2.0 (6-12 months)

**Option 3: Multi-Provider Support**
```
✅ Stable Audio 2.5 (primary, free)
✅ ElevenLabs (premium, high quality)
✅ Replicate (flexible, pay-per-use)
✅ Freesound (library, free)
```

**Why:**
- Maximum flexibility
- Price competition
- Redundancy if one service fails
- Different strengths per provider

---

## 💰 Cost Analysis

### Scenario: 1000 SFX Generations/Month

| Provider | Monthly Cost | Per Generation | Commercial License |
|----------|-------------|----------------|-------------------|
| AudioCraft | $0 (+ $50 EC2) | $0.05 | ❌ NO |
| ElevenLabs Starter | $5 | $0.03 | ✅ YES |
| Stable Audio 2.5 | $0 | $0 | ✅ YES (<$1M) |
| Replicate | ~$64 | $0.064 | ✅ YES |
| SFX Engine | Unknown | Unknown | ✅ YES |

**Winner:** Stable Audio 2.5 (FREE + commercial license!)

---

## 🚀 Immediate Action Plan

### Phase 1: Quick Fix (This Week)
1. ✅ Add disclaimer to AudioCraft usage
2. ✅ Integrate ElevenLabs API ($5/mo plan)
3. ✅ Add provider selection in Settings
4. ✅ Test with 100 free credits

**Effort:** 3-4 hours
**Cost:** $5/month for commercial users
**Risk:** Low (keeps existing + adds commercial option)

### Phase 2: Upgrade (Next Month)
1. ✅ Apply for Stable Audio Community License
2. ✅ Integrate Stable Audio 2.5 API
3. ✅ Set as default for all users
4. ✅ Keep AudioCraft as fallback

**Effort:** 1-2 days
**Cost:** $0 (if revenue <$1M/year)
**Risk:** Low (proven API)

### Phase 3: Polish (3-6 Months)
1. ✅ Add Replicate integration
2. ✅ Implement provider auto-selection (cost/quality)
3. ✅ Add usage analytics
4. ✅ Optimize costs

**Effort:** 3-5 days
**Cost:** Variable (pay-per-use)
**Risk:** Medium (more complex)

---

## 📋 Implementation Checklist

### ElevenLabs Integration (Immediate)
- [ ] Sign up for ElevenLabs API account
- [ ] Get API key
- [ ] Add to environment variables
- [ ] Create ElevenLabsService.ts
- [ ] Update SFXEditor UI with provider selection
- [ ] Add cost display (credits remaining)
- [ ] Test generation workflow
- [ ] Add error handling
- [ ] Document API usage

### Stable Audio Integration (Next)
- [ ] Apply for Community License
- [ ] Review terms and conditions
- [ ] Set up API access
- [ ] Create StableAudioService.ts
- [ ] Test audio quality
- [ ] Compare with AudioCraft
- [ ] Migration plan

### Legal Protection
- [ ] Add Terms of Service
- [ ] Update license disclaimers
- [ ] Add provider-specific warnings
- [ ] User acknowledgment checkbox
- [ ] Document commercial use requirements

---

## 🔗 Useful Links

- **ElevenLabs API Docs:** https://elevenlabs.io/docs
- **Stable Audio Docs:** https://stability.ai/stable-audio
- **Replicate Docs:** https://replicate.com/docs
- **SFX Engine:** https://sfxengine.com
- **Stable Audio Open:** https://github.com/Stability-AI/stable-audio-tools

---

## ✅ Decision

**For CreatorCrafter MVP:**
1. Integrate **ElevenLabs** immediately (3-4 hours work)
2. Plan migration to **Stable Audio 2.5** (next month)
3. Keep AudioCraft with clear non-commercial warning

**Estimated Total Cost:**
- Development: 1 day
- Monthly: $5-50 depending on usage
- Legal risk: Eliminated ✅

---

**Status:** Research complete, ready to implement
**Next Step:** Choose provider and begin integration
**Owner:** Development team
**Timeline:** 1-2 days for MVP, 1 month for full migration
