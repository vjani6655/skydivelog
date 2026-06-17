const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Strips "audio" from UIBackgroundModes in the generated Info.plist.
 *
 * expo-audio's config plugin unconditionally adds UIBackgroundModes: ["audio"],
 * which triggers Apple App Store guideline 2.5.4 if the app never plays audio
 * in the background. This plugin removes it after expo-audio adds it, keeping
 * the native expo-audio module fully functional for foreground playback.
 */
module.exports = function removeBackgroundAudio(config) {
  return withInfoPlist(config, (c) => {
    const modes = c.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      c.modResults.UIBackgroundModes = modes.filter((m) => m !== 'audio');
      if (c.modResults.UIBackgroundModes.length === 0) {
        delete c.modResults.UIBackgroundModes;
      }
    }
    return c;
  });
};
