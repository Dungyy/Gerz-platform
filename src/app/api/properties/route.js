export async function POST(request) {
  const { units, ...propertyData } = await request.json()
  
  // Create property
  const { data: property, error: propError } = await supabase
    .from('properties')
    .insert([propertyData])
    .select()
    .single()

  if (propError) return NextResponse.json({ error: propError.message }, { status: 400 })

  // Create units if provided
  if (units && units.length > 0) {
    const unitsToInsert = units.map(unit => ({
      ...unit,
      property_id: property.id,
      organization_id: propertyData.organization_id,
    }))

    await supabase.from('units').insert(unitsToInsert)
  }

  return NextResponse.json(property)
}