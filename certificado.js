const PDFDocument = require("pdfkit");

function gerarCertificado(nome, email) {
  const doc = new PDFDocument();
  const buffers = [];

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  doc.fontSize(24).text("CERTIFICADO", { align: "center" });
  doc.moveDown();

  doc.fontSize(16).text(
    `Certificamos que ${nome} participou do evento com aproveitamento.`,
    { align: "center" }
  );

  doc.moveDown();
  doc.text("Carga horária: 8 horas", { align: "center" });
  doc.text(`Data: ${new Date().toLocaleDateString()}`, { align: "center" });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
  });
}

module.exports = gerarCertificado;
