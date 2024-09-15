import { SlashCommandBuilder } from 'discord.js'
import mic from 'mic'

export default ({ player }) => {

  const execute = async (interaction) => {
    const voiceChannel = interaction.member.voice?.channel
    if (!voiceChannel) { return }

    const micInstance = mic({
      rate: '44100',  // Sample rate
      channels: '1',   // Mono
      debug: false,     // Enable debugging
      exitOnSilence: 6, // Exit after silence
      device: 'default' // Use the default PulseAudio device
    })

    const micInputStream = micInstance.getAudioStream()
    
    await player.joinChannel(voiceChannel)
    await player.play(micInputStream)
    micInstance.start()
    await interaction.reply({
      content: `Ok bro`,
      ephemeral: true
    })
  }

  return {
    data: new SlashCommandBuilder()
      .setName('playback')
      .setDescription('Playback time !'),

    execute,
  }
} 