module.exports = (to, url) => {
  return {
      from: ` DLG <${process.env.EMAIL}>`, // sender address
      to: to, // list of receivers
      subject: "Validation inscription", // Subject line
      html: `<p>Veuillez confirmer votre adresse mail en cliquant sur le lien suivant : <a href="${url}">CLIQUEZ ICI</a> </p>`
  };
};
