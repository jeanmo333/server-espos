const express = require("express");
const escpos = require("escpos");

// Configuración de escpos para USB
escpos.USB = require("escpos-usb");

const app = express();
const port = 3000;

// Middleware para procesar JSON
app.use(express.json());

app.post("/api/imprimir-boleta", async (req, res) => {
  const { header, items, invoiceNumber, customer } = req.body;

  if (!header || !items || !invoiceNumber) {
    return res.status(400).send("Faltan datos para generar la boleta.");
  }

  try {
    const device = new escpos.USB();
    const options = { encoding: "GB18030" };
    const printer = new escpos.Printer(device, options);

    let total = 0;

    device.open(async (error) => {
      if (error) {
        console.error("Error al abrir la impresora:", error);
        return res.status(500).send("Error al conectar con la impresora.");
      }

      // Imprimir encabezado
      printer
        .align("ct")
        .style("b")
        .size(0, 0) // Tamaño pequeño para texto
        .text(header.map((line) => line.slice(0, 32)).join("\n"))
        .drawLine()
        .font("a")
        .align("lt");

      printer.text(`Fecha: ${new Date().toLocaleDateString()}`);
      printer.text(`Cliente: ${customer}`);
      printer.text(`Boleta No: ${invoiceNumber}`);
      printer.drawLine();

      // Imprimir detalles de los items
      printer.text("Descripcion        Cant  Total");
      items.forEach((item) => {
        const lineTotal = item.quantity * item.price;
        total += lineTotal;
        // Formatear la descripción para que no exceda 13 caracteres
        const description =
          item.description.length > 13
            ? `${item.description.substring(0, 13)}...`
            : item.description;

        // Formatear la cantidad
        const quantity = item.quantity.toString().padStart(3);

        // Formatear el total del ítem
        const formattedTotal = lineTotal.toLocaleString("es-CL").padStart(7);

        // Generar la línea con espaciado adecuado
        const formattedLine = `${description.padEnd(
          18
        )}${quantity}  ${formattedTotal}`;

        printer.text(formattedLine);
      });

      // Imprimir totales
      printer
        .drawLine()
        .align("RT")
        .text(`Subtotal: ${total.toLocaleString("es-CL")} CLP`)
        .text(`IVA (19%): ${(total * 0.19).toLocaleString("es-CL")} CLP`)
        .text(`Total: ${(total * 1.19).toLocaleString("es-CL")} CLP`);
      
      printer
        .align("CT")
        .text('') // Línea en blanco para agregar espacio
        .barcode(`${invoiceNumber}`, 'CODE39')

      printer
        .drawLine()
        .align("CT")
        .text("Gracias por su compra")
        .text("Vuelva pronto.")
        .cut()
        .close();

      res.status(200).send("Boleta enviada a la impresora.");
    });
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    res.status(500).send("Error al generar la boleta.");
  }
});

app.listen(port, () => {
  console.log(`Servidor Express escuchando en http://localhost:${port}`);
});

