const { Client, Events, Collection, REST, Routes, GatewayIntentBits } = require('discord.js')

module.exports = {
  name: 'bot',
  dependencies: [
    require('sools-core-server')
  ],
  construct: async ({ core }, { discord: { token, clientId, guildId } }) => {
    const bot = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
      ],
    })
    const rest = new REST({ version: '10' }).setToken(token)

    const ready = new Promise((resolve) => {
      bot.on("ready", () => {
        console.log(`Logged in as ${bot.user.tag}!`)
        resolve()
      })
    })
    bot.login(token)
    await ready

    bot.commands = new Collection()

    core.on('ready', async () => {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: bot.commands.map((c) => c.data) },
      )
    })

    bot.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = interaction.client.commands.get(interaction.commandName)
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      }
    })

    return bot
  }
}