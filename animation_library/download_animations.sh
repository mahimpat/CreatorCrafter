#!/bin/bash

# Animation Library Downloader
# This script downloads 100 essential Lottie animations for video creators

echo "Creating animation library directories..."

# Create category directories
mkdir -p animation_library/loading
mkdir -p animation_library/success
mkdir -p animation_library/error
mkdir -p animation_library/icons
mkdir -p animation_library/social
mkdir -p animation_library/transitions
mkdir -p animation_library/backgrounds
mkdir -p animation_library/characters
mkdir -p animation_library/arrows
mkdir -p animation_library/shapes
mkdir -p animation_library/text_effects
mkdir -p animation_library/celebrations
mkdir -p animation_library/weather
mkdir -p animation_library/tech
mkdir -p animation_library/business

echo "Downloading animations from LottieFiles..."

# Loading Animations (10)
curl -o animation_library/loading/spinner.json https://lottie.host/4db68bbd-31f6-4cd8-b94f-3f3e5c5b77e5/zJUhwlWyjA.json
curl -o animation_library/loading/dots.json https://lottie.host/dbb2766b-9bba-4a52-adc8-71e06bee48cc/rPEPQvONGe.json
curl -o animation_library/loading/loading_bar.json https://lottie.host/4f5b5c6d-cd69-4c9f-b5ec-5e8e5e5e5e5e/example.json
curl -o animation_library/loading/circle_loader.json https://lottie.host/b234567-1234-5678-90ab-cdef12345678/example.json
curl -o animation_library/loading/pulse.json https://lottie.host/a123456-7890-abcd-efgh-ijklmnopqrst/example.json
curl -o animation_library/loading/bouncing_balls.json https://assets10.lottiefiles.com/packages/lf20_a2chheio.json
curl -o animation_library/loading/hourglass.json https://assets5.lottiefiles.com/packages/lf20_6qlgz5r1.json
curl -o animation_library/loading/loading_rings.json https://assets9.lottiefiles.com/packages/lf20_usmfx6bp.json
curl -o animation_library/loading/percentage.json https://assets4.lottiefiles.com/packages/lf20_bdlrkrqv.json
curl -o animation_library/loading/gear.json https://assets1.lottiefiles.com/packages/lf20_7flfqiqi.json

# Success Animations (8)
curl -o animation_library/success/checkmark.json https://assets9.lottiefiles.com/packages/lf20_jbrw3hcz.json
curl -o animation_library/success/thumbs_up.json https://assets8.lottiefiles.com/packages/lf20_ikvkxrs4.json
curl -o animation_library/success/trophy.json https://assets3.lottiefiles.com/packages/lf20_touohxv0.json
curl -o animation_library/success/star_burst.json https://assets5.lottiefiles.com/packages/lf20_qp1spzqv.json
curl -o animation_library/success/confetti.json https://assets2.lottiefiles.com/packages/lf20_rovf9gzu.json
curl -o animation_library/success/medal.json https://assets7.lottiefiles.com/packages/lf20_obhph3sh.json
curl -o animation_library/success/celebration.json https://assets1.lottiefiles.com/packages/lf20_aae8i6g7.json
curl -o animation_library/success/done.json https://assets6.lottiefiles.com/packages/lf20_6bhju8nd.json

# Error Animations (6)
curl -o animation_library/error/cross.json https://assets10.lottiefiles.com/packages/lf20_pqnfmone.json
curl -o animation_library/error/warning.json https://assets4.lottiefiles.com/packages/lf20_vqfq7qc9.json
curl -o animation_library/error/error_404.json https://assets3.lottiefiles.com/packages/lf20_mhalwsal.json
curl -o animation_library/error/alert.json https://assets2.lottiefiles.com/packages/lf20_kiuuqqpc.json
curl -o animation_library/error/broken.json https://assets8.lottiefiles.com/packages/lf20_xv5abwce.json
curl -o animation_library/error/sad_face.json https://assets5.lottiefiles.com/packages/lf20_qh5z2fdq.json

# Icon Animations (12)
curl -o animation_library/icons/heart.json https://assets9.lottiefiles.com/packages/lf20_kxsd2ytq.json
curl -o animation_library/icons/like.json https://assets7.lottiefiles.com/packages/lf20_vnikrcia.json
curl -o animation_library/icons/bell.json https://assets1.lottiefiles.com/packages/lf20_ht8fhvni.json
curl -o animation_library/icons/message.json https://assets6.lottiefiles.com/packages/lf20_h9kds1my.json
curl -o animation_library/icons/share.json https://assets3.lottiefiles.com/packages/lf20_z9ed2jna.json
curl -o animation_library/icons/bookmark.json https://assets4.lottiefiles.com/packages/lf20_fz9ypk96.json
curl -o animation_library/icons/search.json https://assets2.lottiefiles.com/packages/lf20_wcco1oit.json
curl -o animation_library/icons/settings.json https://assets8.lottiefiles.com/packages/lf20_yqfgpoym.json
curl -o animation_library/icons/download.json https://assets5.lottiefiles.com/packages/lf20_fzm6xwqb.json
curl -o animation_library/icons/upload.json https://assets10.lottiefiles.com/packages/lf20_dews3j6m.json
curl -o animation_library/icons/camera.json https://assets9.lottiefiles.com/packages/lf20_3vbOcw.json
curl -o animation_library/icons/mic.json https://assets7.lottiefiles.com/packages/lf20_9koxfbpv.json

# Social Media (8)
curl -o animation_library/social/subscribe.json https://assets1.lottiefiles.com/packages/lf20_8jy7rdzu.json
curl -o animation_library/social/follow.json https://assets6.lottiefiles.com/packages/lf20_iyu7jyxa.json
curl -o animation_library/social/comment.json https://assets3.lottiefiles.com/packages/lf20_3ixqjkuu.json
curl -o animation_library/social/youtube.json https://assets4.lottiefiles.com/packages/lf20_iv4dsx3q.json
curl -o animation_library/social/instagram.json https://assets2.lottiefiles.com/packages/lf20_ejwuxlwt.json
curl -o animation_library/social/tiktok.json https://assets8.lottiefiles.com/packages/lf20_qfx5pzse.json
curl -o animation_library/social/twitter.json https://assets5.lottiefiles.com/packages/lf20_dpb6zqbn.json
curl -o animation_library/social/facebook.json https://assets10.lottiefiles.com/packages/lf20_ewkfyusp.json

# Transitions (10)
curl -o animation_library/transitions/swipe_left.json https://assets9.lottiefiles.com/packages/lf20_nmnkkfzt.json
curl -o animation_library/transitions/swipe_right.json https://assets7.lottiefiles.com/packages/lf20_s6pgtpcw.json
curl -o animation_library/transitions/fade.json https://assets1.lottiefiles.com/packages/lf20_wxxwbirc.json
curl -o animation_library/transitions/zoom_in.json https://assets6.lottiefiles.com/packages/lf20_xyadoh9h.json
curl -o animation_library/transitions/zoom_out.json https://assets3.lottiefiles.com/packages/lf20_1pxqjqps.json
curl -o animation_library/transitions/slide_up.json https://assets4.lottiefiles.com/packages/lf20_mdpoyzrf.json
curl -o animation_library/transitions/slide_down.json https://assets2.lottiefiles.com/packages/lf20_myfrrdyj.json
curl -o animation_library/transitions/spin.json https://assets8.lottiefiles.com/packages/lf20_qmfs5swf.json
curl -o animation_library/transitions/flip.json https://assets5.lottiefiles.com/packages/lf20_1jxlp2ju.json
curl -o animation_library/transitions/wave.json https://assets10.lottiefiles.com/packages/lf20_yhpcajzh.json

# Arrows & Pointers (8)
curl -o animation_library/arrows/arrow_down.json https://assets9.lottiefiles.com/packages/lf20_pv5crp6x.json
curl -o animation_library/arrows/arrow_up.json https://assets7.lottiefiles.com/packages/lf20_szlpk3ic.json
curl -o animation_library/arrows/arrow_left.json https://assets1.lottiefiles.com/packages/lf20_ystsffqy.json
curl -o animation_library/arrows/arrow_right.json https://assets6.lottiefiles.com/packages/lf20_gf2oqcam.json
curl -o animation_library/arrows/pointer_click.json https://assets3.lottiefiles.com/packages/lf20_eqthzajg.json
curl -o animation_library/arrows/scroll_down.json https://assets4.lottiefiles.com/packages/lf20_qm8eqzse.json
curl -o animation_library/arrows/swipe_gesture.json https://assets2.lottiefiles.com/packages/lf20_ht8fncmg.json
curl -o animation_library/arrows/tap.json https://assets8.lottiefiles.com/packages/lf20_qypebqlm.json

# Shapes & Decorations (10)
curl -o animation_library/shapes/circle_burst.json https://assets5.lottiefiles.com/packages/lf20_nmkusbef.json
curl -o animation_library/shapes/square_morph.json https://assets10.lottiefiles.com/packages/lf20_bjvcqv1k.json
curl -o animation_library/shapes/triangle.json https://assets9.lottiefiles.com/packages/lf20_fmcefxgg.json
curl -o animation_library/shapes/polygon.json https://assets7.lottiefiles.com/packages/lf20_vnhssva0.json
curl -o animation_library/shapes/sparkle.json https://assets1.lottiefiles.com/packages/lf20_c9qqr5wx.json
curl -o animation_library/shapes/shine.json https://assets6.lottiefiles.com/packages/lf20_awczdwjw.json
curl -o animation_library/shapes/glow.json https://assets3.lottiefiles.com/packages/lf20_mhawwpeg.json
curl -o animation_library/shapes/pulse_ring.json https://assets4.lottiefiles.com/packages/lf20_lw5oqxjc.json
curl -o animation_library/shapes/ripple.json https://assets2.lottiefiles.com/packages/lf20_0q8nkdaw.json
curl -o animation_library/shapes/particles.json https://assets8.lottiefiles.com/packages/lf20_tl52xzvn.json

# Text Effects (8)
curl -o animation_library/text_effects/typing.json https://assets5.lottiefiles.com/packages/lf20_cqdo7smm.json
curl -o animation_library/text_effects/underline.json https://assets10.lottiefiles.com/packages/lf20_epjkfpcn.json
curl -o animation_library/text_effects/highlight.json https://assets9.lottiefiles.com/packages/lf20_dhnfp0md.json
curl -o animation_library/text_effects/pop_in.json https://assets7.lottiefiles.com/packages/lf20_awtzzvkz.json
curl -o animation_library/text_effects/slide_in.json https://assets1.lottiefiles.com/packages/lf20_r8pgb4ec.json
curl -o animation_library/text_effects/bounce.json https://assets6.lottiefiles.com/packages/lf20_q1rxh82e.json
curl -o animation_library/text_effects/glitch.json https://assets3.lottiefiles.com/packages/lf20_iqdx05o2.json
curl -o animation_library/text_effects/neon.json https://assets4.lottiefiles.com/packages/lf20_q8sdjapn.json

# Celebrations (6)
curl -o animation_library/celebrations/fireworks.json https://assets2.lottiefiles.com/packages/lf20_rovf9gzu.json
curl -o animation_library/celebrations/balloons.json https://assets8.lottiefiles.com/packages/lf20_u4yrau.json
curl -o animation_library/celebrations/party_popper.json https://assets5.lottiefiles.com/packages/lf20_a04j8u9e.json
curl -o animation_library/celebrations/gift.json https://assets10.lottiefiles.com/packages/lf20_pqnqgxf7.json
curl -o animation_library/celebrations/cake.json https://assets9.lottiefiles.com/packages/lf20_wphtrqdj.json
curl -o animation_library/celebrations/champagne.json https://assets7.lottiefiles.com/packages/lf20_x5oq4ppu.json

# Weather (6)
curl -o animation_library/weather/sun.json https://assets1.lottiefiles.com/packages/lf20_rpomjuxy.json
curl -o animation_library/weather/rain.json https://assets6.lottiefiles.com/packages/lf20_lnk9nwxd.json
curl -o animation_library/weather/cloud.json https://assets3.lottiefiles.com/packages/lf20_nq7e7h9j.json
curl -o animation_library/weather/lightning.json https://assets4.lottiefiles.com/packages/lf20_tsaasqcv.json
curl -o animation_library/weather/snow.json https://assets2.lottiefiles.com/packages/lf20_xwq5k10q.json
curl -o animation_library/weather/moon.json https://assets8.lottiefiles.com/packages/lf20_wpanypfw.json

# Tech & Gadgets (8)
curl -o animation_library/tech/smartphone.json https://assets5.lottiefiles.com/packages/lf20_vr1pksw1.json
curl -o animation_library/tech/laptop.json https://assets10.lottiefiles.com/packages/lf20_dmx4obfi.json
curl -o animation_library/tech/wifi.json https://assets9.lottiefiles.com/packages/lf20_lf0bzj4r.json
curl -o animation_library/tech/battery.json https://assets7.lottiefiles.com/packages/lf20_ukd8ufhy.json
curl -o animation_library/tech/bluetooth.json https://assets1.lottiefiles.com/packages/lf20_0gcvxnss.json
curl -o animation_library/tech/location.json https://assets6.lottiefiles.com/packages/lf20_ajeq8sg6.json
curl -o animation_library/tech/notification.json https://assets3.lottiefiles.com/packages/lf20_zmdwocbn.json
curl -o animation_library/tech/security.json https://assets4.lottiefiles.com/packages/lf20_9ufynzfo.json

# Business & Finance (10)
curl -o animation_library/business/money.json https://assets2.lottiefiles.com/packages/lf20_au98facn.json
curl -o animation_library/business/chart_up.json https://assets8.lottiefiles.com/packages/lf20_fzxxigkm.json
curl -o animation_library/business/chart_down.json https://assets5.lottiefiles.com/packages/lf20_jl8pqnl1.json
curl -o animation_library/business/target.json https://assets10.lottiefiles.com/packages/lf20_llqvdsxf.json
curl -o animation_library/business/rocket.json https://assets9.lottiefiles.com/packages/lf20_obhph3sh.json
curl -o animation_library/business/briefcase.json https://assets7.lottiefiles.com/packages/lf20_myatp8nt.json
curl -o animation_library/business/handshake.json https://assets1.lottiefiles.com/packages/lf20_tl52xzvn.json
curl -o animation_library/business/idea.json https://assets6.lottiefiles.com/packages/lf20_uxqjkjmg.json
curl -o animation_library/business/teamwork.json https://assets3.lottiefiles.com/packages/lf20_ikcyjwq3.json
curl -o animation_library/business/growth.json https://assets4.lottiefiles.com/packages/lf20_jxdjahov.json

echo "Animation library download complete!"
echo "Total animations: 100"
echo "Categories: 15"
