import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('l', 'mm', 'a4')
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  let heightLeft = pdfHeight
  let position = 0
  const pageHeight = pdf.internal.pageSize.getHeight()

  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - pdfHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
    heightLeft -= pageHeight
  }

  pdf.save(`${filename}.pdf`)
}

export async function printElement(elementId: string) {
  const element = document.getElementById(elementId)
  if (!element) return

  const originalOverflow = document.body.style.overflow
  const clone = element.cloneNode(true) as HTMLElement
  clone.style.position = 'absolute'
  clone.style.left = '0'
  clone.style.top = '0'
  clone.style.width = '100%'
  clone.style.zIndex = '9999'
  clone.style.background = '#fff'
  document.body.appendChild(clone)
  document.body.style.overflow = 'hidden'

  window.print()

  document.body.removeChild(clone)
  document.body.style.overflow = originalOverflow
}
