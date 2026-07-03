const { Dbf } = require('dbf-reader')
const fs = require('fs')
const path = 'C:\\Para_actualizar\\B1_020726_210059\\grwjuliocontisrl\\grw232\\DATA\\GR2_600.DBF'
const buffer = fs.readFileSync(path)
const dt = Dbf.read(buffer)
console.log('Total rows:', dt.rows.length)
console.log('Columns:', dt.columns.map(c => c.name).join(', '))
console.log('All data:')
console.log(JSON.stringify(dt.rows, null, 2))
