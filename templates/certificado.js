const PDFDocument = require("pdfkit");

module.exports = function gerarCertificado({
  nome,
  evento,
  cargaHoraria,
  data
}) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    doc
      .fontSize(26)
      .text("CERTIFICADO", { align: "center" });

    doc.moveDown(2);

    doc
      .fontSize(14)
      .text(
        `Certificamos que ${nome} participou do evento "${evento}", ` +
        `com carga horária total de ${cargaHoraria} horas.`,
        { align: "center" }
      );

    doc.moveDown(2);

    doc.text(
      "O presente certificado é concedido para fins de comprovação de participação.",
      { align: "center" }
    );

    doc.moveDown(4);

    doc.text(`Data: ${data}`, { align: "center" });

    doc.moveDown(6);

    doc.text("__________________________________", { align: "center" });
    doc.text("Coordenação do Evento", { align: "center" });

    doc.end();
  });
};
