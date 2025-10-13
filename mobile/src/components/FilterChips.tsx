import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Factory, Store, Ruler, HardHat } from 'lucide-react-native';

type FilterType = 'all' | 'distributor' | 'dealer' | 'architect' | 'contractor';

interface FilterChipsProps {
  selected: FilterType;
  onSelect: (type: FilterType) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ selected, onSelect }) => {
  const chipStyle = (isSelected: boolean) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: isSelected ? '#D4A944' : '#F8F8F8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: isSelected ? '#D4A944' : '#E0E0E0',
  });

  const textStyle = (isSelected: boolean) => ({
    color: isSelected ? '#393735' : '#1A1A1A',
    fontSize: 14,
    fontWeight: '600' as const,
    marginLeft: 6,
  });

  return (
    <View style={{ width: '100%' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
        contentContainerStyle={{ paddingHorizontal: 16, flexDirection: 'row' }}
      >
      <TouchableOpacity style={chipStyle(selected === 'all')} onPress={() => onSelect('all')}>
        <Text style={{ ...textStyle(selected === 'all'), marginLeft: 0 }}>All</Text>
      </TouchableOpacity>

      <TouchableOpacity style={chipStyle(selected === 'dealer')} onPress={() => onSelect('dealer')}>
        <Store size={16} color={selected === 'dealer' ? '#393735' : '#666666'} />
        <Text style={textStyle(selected === 'dealer')}>Dealers</Text>
      </TouchableOpacity>

      <TouchableOpacity style={chipStyle(selected === 'architect')} onPress={() => onSelect('architect')}>
        <Ruler size={16} color={selected === 'architect' ? '#393735' : '#666666'} />
        <Text style={textStyle(selected === 'architect')}>Architects</Text>
      </TouchableOpacity>

      <TouchableOpacity style={chipStyle(selected === 'contractor')} onPress={() => onSelect('contractor')}>
        <HardHat size={16} color={selected === 'contractor' ? '#393735' : '#666666'} />
        <Text style={textStyle(selected === 'contractor')}>Contractors</Text>
      </TouchableOpacity>

      <TouchableOpacity style={chipStyle(selected === 'distributor')} onPress={() => onSelect('distributor')}>
        <Factory size={16} color={selected === 'distributor' ? '#393735' : '#666666'} />
        <Text style={textStyle(selected === 'distributor')}>Distributors</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
};
